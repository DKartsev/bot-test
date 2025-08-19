# Test SSH connection
Write-Host "Testing SSH connection..." -ForegroundColor Green

# Test 1: Basic connection
Write-Host "Test 1: Basic SSH connection" -ForegroundColor Blue
try {
    $result = ssh -i "yandex-vm-key" "dankartsev@84.201.146.125" "echo 'Connection OK'" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SSH connection successful" -ForegroundColor Green
        Write-Host "Response: $result" -ForegroundColor White
    } else {
        Write-Host "❌ SSH connection failed" -ForegroundColor Red
        Write-Host "Error: $result" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ SSH connection error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Check SSH key permissions
Write-Host "Test 2: SSH key permissions" -ForegroundColor Blue
$acl = Get-Acl "yandex-vm-key"
Write-Host "Owner: $($acl.Owner)" -ForegroundColor White
Write-Host "Access:" -ForegroundColor White
$acl.Access | ForEach-Object {
    Write-Host "  $($_.IdentityReference) - $($_.FileSystemRights)" -ForegroundColor White
}

Write-Host ""

# Test 3: Check SSH key content
Write-Host "Test 3: SSH key content" -ForegroundColor Blue
$keyContent = Get-Content "yandex-vm-key" -Raw
$keyLength = $keyContent.Length
Write-Host "Key length: $keyLength characters" -ForegroundColor White
Write-Host "Key starts with: $($keyContent.Substring(0, [Math]::Min(50, $keyLength)))..." -ForegroundColor White

Write-Host ""

# Test 4: Check public key
Write-Host "Test 4: Public key" -ForegroundColor Blue
if (Test-Path "yandex-vm-key.pub") {
    $pubKey = Get-Content "yandex-vm-key.pub"
    Write-Host "Public key found:" -ForegroundColor White
    Write-Host $pubKey -ForegroundColor White
} else {
    Write-Host "❌ Public key not found" -ForegroundColor Red
}

Write-Host ""

# Test 5: Try verbose SSH
Write-Host "Test 5: Verbose SSH connection" -ForegroundColor Blue
Write-Host "Running: ssh -v -i 'yandex-vm-key' 'dankartsev@84.201.146.125' 'echo test'" -ForegroundColor White
try {
    $result = ssh -v -i "yandex-vm-key" "dankartsev@84.201.146.125" "echo test" 2>&1
    Write-Host "Verbose output:" -ForegroundColor White
    Write-Host $result -ForegroundColor White
} catch {
    Write-Host "❌ Verbose SSH error: $($_.Exception.Message)" -ForegroundColor Red
}
