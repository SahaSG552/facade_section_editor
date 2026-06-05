# Скрипт настройки PostgreSQL для order-manager
# Запустите в PowerShell от имени администратора (или обычном, если есть права)

Write-Host "=== Настройка PostgreSQL для order-manager ===" -ForegroundColor Cyan

# Параметры подключения
$PG_USER = "postgres"
$DB_NAME = "order_manager"
$APP_USER = "order_user"
$APP_PASSWORD = "order_pass"

Write-Host "`n1. Создание базы данных $DB_NAME..." -ForegroundColor Yellow
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U $PG_USER -c "CREATE DATABASE $DB_NAME;"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка при создании БД. Возможно, она уже существует." -ForegroundColor Red
} else {
    Write-Host "База данных создана" -ForegroundColor Green
}

Write-Host "`n2. Создание пользователя $APP_USER..." -ForegroundColor Yellow
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U $PG_USER -c "CREATE USER $APP_USER WITH PASSWORD '$APP_PASSWORD';"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Пользователь уже существует или ошибка" -ForegroundColor Yellow
} else {
    Write-Host "Пользователь создан" -ForegroundColor Green
}

Write-Host "`n3. Выдача прав на БД..." -ForegroundColor Yellow
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U $PG_USER -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $APP_USER;"

Write-Host "`n4. Применение миграций..." -ForegroundColor Yellow
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U $APP_USER -d $DB_NAME -f "$PSScriptRoot\migrations\001_initial_schema.sql"

Write-Host "`n=== Готово! ===" -ForegroundColor Green
Write-Host "Теперь можно запускать backend:" -ForegroundColor Cyan
Write-Host "cd order-manager/backend"
Write-Host "npm run dev"
