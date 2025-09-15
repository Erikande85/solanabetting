# Build script for Solana betting dApp
$ErrorActionPreference = "Stop"

Write-Host "Building Solana Betting dApp..." -ForegroundColor Green

# Set environment variables
$env:RUST_LOG = "solana_rbpf=trace"

# Build the program
$buildCmd = "C:\Users\$env:USERNAME\.local\share\solana\install\active_release\bin\cargo-build-sbf.exe"
$manifestPath = "programs\solana-betting-dapp\Cargo.toml"
$outputDir = "target\deploy"

# Create output directory if it doesn't exist
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

# Run the build
& $buildCmd --manifest-path $manifestPath --sbf-out-dir $outputDir 2>&1 | Tee-Object -FilePath "build.log"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful! Program file created at: $outputDir\solana_betting_dapp.so" -ForegroundColor Green
    
    # Display program size
    $programFile = "$outputDir\solana_betting_dapp.so"
    if (Test-Path $programFile) {
        $size = (Get-Item $programFile).Length / 1KB
        Write-Host "Program size: $([math]::Round($size, 2)) KB" -ForegroundColor Cyan
    }
} else {
    Write-Host "Build failed. Check build.log for details." -ForegroundColor Red
    exit 1
}