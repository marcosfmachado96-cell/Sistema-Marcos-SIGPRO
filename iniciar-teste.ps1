# =====================================================================
# Script unico - Sistema de Medicoes DER/PR (ambiente de TESTE, Windows)
# Conserta e sobe tudo: dependencias, banco (porta 5433), migration,
# coordenador, backend e frontend. Preserva os dados quando o banco ja
# esta saudavel; recria do zero apenas se necessario. Nao use em producao.
# =====================================================================

$ErrorActionPreference = 'Continue'
$root = $PSScriptRoot
$dbPort = 5433
$dbUrl = "postgresql://medicao:medicao@localhost:$dbPort/medicao_der_pr?schema=public"
$script:coordEmail = $null
$script:coordSenha = $null

function Titulo($t) { Write-Host ""; Write-Host "==> $t" -ForegroundColor Cyan }
function Ok($t)     { Write-Host "    [ok] $t" -ForegroundColor Green }
function Aviso($t)  { Write-Host "    [!] $t" -ForegroundColor Yellow }
function Parar($t)  { throw $t }
function EsperarBanco {
  for ($i = 0; $i -lt 30; $i++) {
    docker exec medicao-db pg_isready -U medicao -d medicao_der_pr 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { return $true }
    Start-Sleep -Seconds 2
  }
  return $false
}

try {
  Write-Host "Sistema de Medicoes DER/PR - preparando o ambiente de teste" -ForegroundColor White

  # 0. Projeto
  Titulo "Localizando o projeto"
  if (-not (Test-Path (Join-Path $root 'package.json'))) {
    $alt = Join-Path $root 'medicao-der-pr'
    if (Test-Path (Join-Path $alt 'package.json')) { $root = $alt }
    else { Parar "Nao encontrei o package.json. Extraia TODO o conteudo do medicao-der-pr.zip e rode o iniciar-teste.cmd de dentro da pasta extraida." }
  }
  Ok "Projeto: $root"

  # 1. Pre-requisitos
  Titulo "Verificando pre-requisitos"
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Parar "Node.js nao encontrado. Instale em https://nodejs.org" }
  Ok ("Node.js " + (node --version))
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Parar "Docker nao encontrado. Instale o Docker Desktop." }
  docker info 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { Parar "O Docker nao esta em execucao. Abra o Docker Desktop e espere iniciar." }
  Ok "Docker em execucao"

  # 2. Banco PostgreSQL (preserva se saudavel; recria se preciso)
  Titulo "Preparando o PostgreSQL (porta $dbPort)"
  $existe = docker ps -a --filter "name=^medicao-db$" --format "{{.Names}}" 2>$null
  $recriar = $false
  if ($existe -eq 'medicao-db') {
    docker start medicao-db 2>$null | Out-Null
    $pronto = EsperarBanco
    $porta = docker port medicao-db 5432 2>$null
    $credOk = $false
    if ($pronto) {
      docker exec medicao-db psql -U medicao -d medicao_der_pr -c "select 1" 2>$null | Out-Null
      if ($LASTEXITCODE -eq 0) { $credOk = $true }
    }
    if (($porta -match ":$dbPort") -and $credOk) {
      Ok "Banco existente reaproveitado (seus dados de teste foram preservados)."
    } else {
      Aviso "Container existente incompativel (porta ou credenciais) - sera recriado."
      $recriar = $true
    }
  } else {
    $recriar = $true
  }
  if ($recriar) {
    docker rm -f medicao-db 2>$null | Out-Null
    docker run --name medicao-db -e POSTGRES_USER=medicao -e POSTGRES_PASSWORD=medicao -e POSTGRES_DB=medicao_der_pr -p "${dbPort}:5432" -d postgres:16 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { Parar "Falha ao criar o container do PostgreSQL (porta $dbPort em uso?)." }
    if (-not (EsperarBanco)) { Parar "O PostgreSQL nao respondeu a tempo." }
    Ok "Banco criado limpo."
  }

  # 3. .env (cria, ou apenas ajusta a DATABASE_URL preservando o resto)
  Titulo "Configurando o backend (.env)"
  $envPath = Join-Path $root ".env"
  if (Test-Path $envPath) {
    $linhasEnv = Get-Content $envPath
    $achou = $false
    $novas = @(foreach ($l in $linhasEnv) {
      if ($l -match '^DATABASE_URL=') { $achou = $true; "DATABASE_URL=$dbUrl" } else { $l }
    })
    if (-not $achou) { $novas += "DATABASE_URL=$dbUrl" }
    [System.IO.File]::WriteAllText($envPath, (($novas) -join "`r`n"))
    Ok ".env ajustado (DATABASE_URL na porta $dbPort; restante preservado)."
  } else {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $jwt = ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
    $emailPadrao = 'coordenador@teste.local'
    $email = Read-Host "    E-mail do coordenador (Enter para $emailPadrao)"
    if ([string]::IsNullOrWhiteSpace($email)) { $email = $emailPadrao }
    $senhaPadrao = 'Teste@12345'
    $senha = Read-Host "    Senha do coordenador (Enter para $senhaPadrao)"
    if ([string]::IsNullOrWhiteSpace($senha)) { $senha = $senhaPadrao }
    $linhas = @(
      'NODE_ENV=development', 'PORT=3000', 'APP_URL_BASE=http://localhost:5173', '',
      "DATABASE_URL=$dbUrl", '',
      "JWT_SECRET=$jwt", 'JWT_EXPIRES_IN=8h', 'CONVITE_VALIDADE_HORAS=72', '',
      'SEED_COORDENADOR_NOME=Coordenador de Teste', "SEED_COORDENADOR_EMAIL=$email", "SEED_COORDENADOR_SENHA=$senha", '',
      '# Armazenamento em disco local (teste sem bucket).', 'STORAGE_DRIVER=local', '',
      '# E-mail em modo dry-run (apenas no log).', 'EMAIL_FINANCEIRO=financeiro@simemp.com.br', '',
      '# IA: sem chave, opera em simulacao.', 'ANTHROPIC_API_KEY=', 'IA_MODELO=claude-sonnet-4-6'
    )
    [System.IO.File]::WriteAllText($envPath, ($linhas -join "`r`n"))
    Ok ".env criado (coordenador: $email)"
    $script:coordEmail = $email; $script:coordSenha = $senha
  }

  # 4. Backend: dependencias + prisma + seed
  Titulo "Instalando dependencias do backend (pode demorar)"
  Push-Location $root
  npm install
  if ($LASTEXITCODE -ne 0) { Pop-Location; Parar "npm install (backend) falhou." }
  Ok "Dependencias do backend instaladas"

  Titulo "Aplicando o banco de dados (Prisma)"
  npx prisma generate
  if ($LASTEXITCODE -ne 0) { Pop-Location; Parar "prisma generate falhou." }
  npx prisma migrate dev --name update
  if ($LASTEXITCODE -ne 0) { Pop-Location; Parar "prisma migrate falhou (confira a DATABASE_URL e o Docker)." }
  Ok "Banco atualizado"

  Titulo "Garantindo o usuario coordenador"
  npm run seed
  if ($LASTEXITCODE -ne 0) { Aviso "Seed retornou aviso (o coordenador provavelmente ja existe) - seguindo." } else { Ok "Coordenador pronto" }
  Pop-Location

  # 5. Frontend
  Titulo "Instalando dependencias do frontend"
  $frontDir = Join-Path $root "frontend"
  $frontEnv = Join-Path $frontDir ".env"
  if (-not (Test-Path $frontEnv)) { [System.IO.File]::WriteAllText($frontEnv, "VITE_API_URL=/api`r`n") }
  Push-Location $frontDir
  npm install
  if ($LASTEXITCODE -ne 0) { Pop-Location; Parar "npm install (frontend) falhou." }
  Pop-Location
  Ok "Dependencias do frontend instaladas"

  # 6. Subir os servidores
  Titulo "Iniciando os servidores"
  Start-Process cmd -ArgumentList '/k','npm run dev' -WorkingDirectory $root
  Start-Process cmd -ArgumentList '/k','npm run dev' -WorkingDirectory $frontDir
  Ok "Backend (3000) e frontend (5173) iniciando em janelas separadas"

  # 7. Conferir saude do backend
  Titulo "Conferindo o backend"
  $saude = $false
  Start-Sleep -Seconds 6
  for ($i = 0; $i -lt 12; $i++) {
    try {
      $r = Invoke-WebRequest -Uri "http://localhost:3000/saude" -UseBasicParsing -TimeoutSec 3
      if ($r.StatusCode -eq 200) { $saude = $true; break }
    } catch { Start-Sleep -Seconds 2 }
  }
  if ($saude) { Ok "Backend respondeu em http://localhost:3000/saude" }
  else { Aviso "O backend ainda nao respondeu. Veja a janela do backend para a mensagem de erro." }

  Start-Process "http://localhost:5173"

  Write-Host ""
  Write-Host "===================================================================" -ForegroundColor Green
  Write-Host " Pronto! Acesse: http://localhost:5173" -ForegroundColor Green
  if ($script:coordEmail) {
    Write-Host (" Login coordenador: " + $script:coordEmail) -ForegroundColor Green
    Write-Host (" Senha:             " + $script:coordSenha) -ForegroundColor Green
  } else {
    Write-Host " Login: credenciais SEED_COORDENADOR_* do seu .env" -ForegroundColor Green
  }
  Write-Host " Banco na porta $dbPort | Anexos em uploads_local | E-mail/IA em modo teste" -ForegroundColor Gray
  Write-Host " Parar: feche as duas janelas dos servidores." -ForegroundColor Gray
  Write-Host "===================================================================" -ForegroundColor Green
}
catch {
  Write-Host ""
  Write-Host ("ERRO: " + $_.Exception.Message) -ForegroundColor Red
  Write-Host "Corrija o ponto acima e rode novamente. O script pode ser repetido com seguranca." -ForegroundColor Yellow
  exit 1
}
