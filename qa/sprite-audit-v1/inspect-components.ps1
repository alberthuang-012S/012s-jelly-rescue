param(
    [string]$Source = (Join-Path $PSScriptRoot 'after-source-generated.png')
)

Add-Type -AssemblyName System.Drawing
$cellWidth = 374
$cellHeight = 352
$directions = @('down', 'left', 'right', 'up')
$threshold = 8
$rawBitmap = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $Source).Path)
$bitmap = New-Object -TypeName System.Drawing.Bitmap -ArgumentList @([int]($cellWidth * 3), [int]($cellHeight * 4), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$paddingGraphics = [System.Drawing.Graphics]::FromImage($bitmap)
$paddingGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$paddingGraphics.Clear([System.Drawing.Color]::Transparent)
$paddingGraphics.DrawImage($rawBitmap, 0, 0, $rawBitmap.Width, $rawBitmap.Height)
$paddingGraphics.Dispose()
$rawBitmap.Dispose()

function Get-Components {
    param([int]$X0, [int]$Y0)

    $visited = New-Object 'bool[,]' $cellWidth, $cellHeight
    $components = @()
    for ($y = 0; $y -lt $cellHeight; $y++) {
        for ($x = 0; $x -lt $cellWidth; $x++) {
            if ($visited[$x, $y] -or $bitmap.GetPixel($X0 + $x, $Y0 + $y).A -le $threshold) { continue }
            $queue = New-Object 'System.Collections.Generic.Queue[System.Drawing.Point]'
            $queue.Enqueue([System.Drawing.Point]::new($x, $y))
            $visited[$x, $y] = $true
            $count = 0
            $minX = $cellWidth; $minY = $cellHeight; $maxX = -1; $maxY = -1
            while ($queue.Count -gt 0) {
                $point = $queue.Dequeue()
                $count++
                if ($point.X -lt $minX) { $minX = $point.X }
                if ($point.Y -lt $minY) { $minY = $point.Y }
                if ($point.X -gt $maxX) { $maxX = $point.X }
                if ($point.Y -gt $maxY) { $maxY = $point.Y }
                for ($dy = -1; $dy -le 1; $dy++) {
                    for ($dx = -1; $dx -le 1; $dx++) {
                        if ($dx -eq 0 -and $dy -eq 0) { continue }
                        $nx = $point.X + $dx; $ny = $point.Y + $dy
                        if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $cellWidth -or $ny -ge $cellHeight) { continue }
                        if ($visited[$nx, $ny]) { continue }
                        if ($bitmap.GetPixel($X0 + $nx, $Y0 + $ny).A -le $threshold) { continue }
                        $visited[$nx, $ny] = $true
                        $queue.Enqueue([System.Drawing.Point]::new($nx, $ny))
                    }
                }
            }
            $components += [pscustomobject]@{
                pixels = $count
                bbox = @($minX, $minY, $maxX, $maxY)
                touchesTop = ($minY -eq 0)
                touchesBottom = ($maxY -eq ($cellHeight - 1))
            }
        }
    }
    return $components | Sort-Object pixels -Descending
}

foreach ($row in 0, 1, 2, 3) {
    foreach ($column in 0, 1, 2) {
        $components = Get-Components -X0 ($column * $cellWidth) -Y0 ($row * $cellHeight)
        Write-Output ("{0} frame {1}" -f $directions[$row], $column)
        $components | Where-Object { $_.pixels -gt 10 -or $_.touchesTop -or $_.touchesBottom } | Select-Object -First 12 | ForEach-Object {
            Write-Output ("  pixels={0} bbox={1} top={2} bottom={3}" -f $_.pixels, ($_.bbox -join ','), $_.touchesTop, $_.touchesBottom)
        }
    }
}
$bitmap.Dispose()
