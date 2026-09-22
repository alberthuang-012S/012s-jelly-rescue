param(
    [string]$Before = (Join-Path $PSScriptRoot '..\..\reference\jelly-anthropomorphic-player-walk.png'),
    [string]$After = (Join-Path $PSScriptRoot '..\..\reference\runtime\jelly-anthropomorphic-player-walk-v3.png'),
    [string]$OutputRoot = $PSScriptRoot
)

Add-Type -AssemblyName System.Drawing

$columns = 3
$rows = 4
$directions = @('down', 'left', 'right', 'up')
$frameLabels = @('0', '1', '2')
$checkerSize = 16
$previewWidth = 420
$previewHeight = 400
$previewLeft = 0
$previewTop = 42
$alphaThreshold = 8

function New-ArgbBitmap {
    param([int]$Width, [int]$Height)
    New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
}

function Draw-Checkerboard {
    param(
        [System.Drawing.Graphics]$Graphics,
        [int]$X,
        [int]$Y,
        [int]$Width,
        [int]$Height
    )

    $light = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 246, 248, 252))
    $dark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 220, 226, 235))
    for ($y = 0; $y -lt $Height; $y += $checkerSize) {
        for ($x = 0; $x -lt $Width; $x += $checkerSize) {
            $brush = if (([int](($x / $checkerSize) + ($y / $checkerSize)) % 2) -eq 0) { $light } else { $dark }
            $drawWidth = [Math]::Min($checkerSize, $Width - $x)
            $drawHeight = [Math]::Min($checkerSize, $Height - $y)
            $Graphics.FillRectangle($brush, $X + $x, $Y + $y, $drawWidth, $drawHeight)
        }
    }
    $light.Dispose()
    $dark.Dispose()
}

function Get-AlphaMetrics {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [int]$X0,
        [int]$Y0,
        [int]$Width,
        [int]$Height,
        [int]$Threshold
    )

    $minX = $Width
    $minY = $Height
    $maxX = -1
    $maxY = -1
    $edgeAny = [ordered]@{ top = 0; bottom = 0; left = 0; right = 0 }
    $edgeThreshold = [ordered]@{ top = 0; bottom = 0; left = 0; right = 0 }
    $opaquePixels = 0

    for ($y = 0; $y -lt $Height; $y++) {
        for ($x = 0; $x -lt $Width; $x++) {
            $alpha = $Bitmap.GetPixel($X0 + $x, $Y0 + $y).A
            if ($alpha -gt 0) {
                if ($y -eq 0) { $edgeAny.top++ }
                if ($y -eq ($Height - 1)) { $edgeAny.bottom++ }
                if ($x -eq 0) { $edgeAny.left++ }
                if ($x -eq ($Width - 1)) { $edgeAny.right++ }
            }
            if ($alpha -gt $Threshold) {
                $opaquePixels++
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
                if ($y -eq 0) { $edgeThreshold.top++ }
                if ($y -eq ($Height - 1)) { $edgeThreshold.bottom++ }
                if ($x -eq 0) { $edgeThreshold.left++ }
                if ($x -eq ($Width - 1)) { $edgeThreshold.right++ }
            }
        }
    }

    [pscustomobject]@{
        bbox = if ($maxX -ge 0) { @($minX, $minY, $maxX, $maxY) } else { @() }
        opaquePixels = $opaquePixels
        edgeAlpha = [pscustomobject]$edgeThreshold
        edgeAnyAlpha = [pscustomobject]$edgeAny
        padding = if ($maxX -ge 0) {
            [pscustomobject]@{
                top = $minY
                bottom = ($Height - 1) - $maxY
                left = $minX
                right = ($Width - 1) - $maxX
            }
        } else { $null }
    }
}

function Save-Png {
    param([System.Drawing.Bitmap]$Bitmap, [string]$Path)
    $parent = Split-Path -Parent $Path
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    $Bitmap.Save([System.IO.Path]::GetFullPath($Path), [System.Drawing.Imaging.ImageFormat]::Png)
}

function Render-Variant {
    param(
        [string]$SourcePath,
        [string]$Variant,
        [string]$VariantDirectory,
        [int]$SourceCellWidth,
        [int]$SourceCellHeight
    )

    $source = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $SourcePath).Path)
    $metrics = @()
    $grid = New-ArgbBitmap -Width ($previewWidth * $columns) -Height (($previewHeight + 42) * $rows)
    $gridGraphics = [System.Drawing.Graphics]::FromImage($grid)
    $gridGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $gridGraphics.Clear([System.Drawing.Color]::White)
    $gridGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
    $smallFont = New-Object System.Drawing.Font('Segoe UI', 8, [System.Drawing.FontStyle]::Regular)
    $labelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 25, 35, 55))
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 210, 35, 55), 2)

    for ($row = 0; $row -lt $rows; $row++) {
        for ($column = 0; $column -lt $columns; $column++) {
            $sourceX = $column * $SourceCellWidth
            $sourceY = $row * $SourceCellHeight
            $direction = $directions[$row]
            $frame = $frameLabels[$column]
            $previewX = $column * $previewWidth
            $previewY = $row * ($previewHeight + 42)

            $single = New-ArgbBitmap -Width $previewWidth -Height ($previewHeight + 42)
            $singleGraphics = [System.Drawing.Graphics]::FromImage($single)
            $singleGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
            $singleGraphics.Clear([System.Drawing.Color]::White)
            $singleGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
            Draw-Checkerboard -Graphics $singleGraphics -X $previewLeft -Y $previewTop -Width $previewWidth -Height $previewHeight
            $destinationRectangle = [System.Drawing.Rectangle]::new($previewLeft, $previewTop, $previewWidth, $previewHeight)
            $singleGraphics.DrawImage($source, $destinationRectangle, $sourceX, $sourceY, $SourceCellWidth, $SourceCellHeight, [System.Drawing.GraphicsUnit]::Pixel)
            $singleGraphics.DrawRectangle($borderPen, $previewLeft, $previewTop, $previewWidth - 1, $previewHeight - 1)
            $singleGraphics.DrawString(("{0}  frame {1}" -f $direction.ToUpperInvariant(), $frame), $font, $labelBrush, 6, 5)
            $singleGraphics.DrawString(("sourceX={0} sourceY={1} sourceWidth={2} sourceHeight={3}" -f $sourceX, $sourceY, $SourceCellWidth, $SourceCellHeight), $smallFont, $labelBrush, 6, 24)
            $gridGraphics.DrawImageUnscaled($single, $previewX, $previewY)
            Save-Png -Bitmap $single -Path (Join-Path $VariantDirectory ("{0}-frame-{1}.png" -f $direction, $frame))
            $singleGraphics.Dispose()
            $single.Dispose()

            $frameMetrics = Get-AlphaMetrics -Bitmap $source -X0 $sourceX -Y0 $sourceY -Width $SourceCellWidth -Height $SourceCellHeight -Threshold $alphaThreshold
            $metrics += [pscustomobject]@{
                direction = $direction
                frame = [int]$frame
                sourceX = $sourceX
                sourceY = $sourceY
                sourceWidth = $SourceCellWidth
                sourceHeight = $SourceCellHeight
                metrics = $frameMetrics
            }
        }
    }

    Save-Png -Bitmap $grid -Path (Join-Path $OutputRoot ("v3-{0}-grid.png" -f $Variant))
    $gridGraphics.Dispose()
    $grid.Dispose()
    $borderPen.Dispose()
    $labelBrush.Dispose()
    $font.Dispose()
    $smallFont.Dispose()
    $source.Dispose()
    return $metrics
}

function Render-SideLegCheck {
    param([string]$SourcePath)

    $source = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $SourcePath).Path)
    $panelWidth = 560
    $panelHeight = 300
    $cropY = 220
    $cropHeight = 180
    $canvas = New-ArgbBitmap -Width ($panelWidth * 3) -Height ($panelHeight * 2)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $font = New-Object System.Drawing.Font('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 25, 35, 55))
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 210, 35, 55), 2)

    foreach ($row in 1, 2) {
        $direction = $directions[$row]
        foreach ($column in 0, 1, 2) {
            $frame = $frameLabels[$column]
            $x0 = $column * 420
            $y0 = $row * 400
            $panelX = $column * $panelWidth
            $panelY = ($row - 1) * $panelHeight
            Draw-Checkerboard -Graphics $graphics -X ($panelX + 10) -Y ($panelY + 42) -Width 540 -Height 240
            $destination = [System.Drawing.Rectangle]::new($panelX + 10, $panelY + 42, 540, 240)
            # Clone one cell before enlarging it. Drawing a scaled rectangle
            # directly from the atlas lets the resampler read neighboring
            # cells, which would make this diagnostic look like a bleed even
            # when the runtime source rectangle is correct.
            $cell = $source.Clone([System.Drawing.Rectangle]::new($x0, $y0, 420, 400), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            $crop = $cell.Clone([System.Drawing.Rectangle]::new(0, $cropY, 420, $cropHeight), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            # Use explicit nearest-neighbor pixels for this inspection image;
            # GDI+ can expose transparent RGB fringes when enlarging an
            # alpha bitmap with a source rectangle.
            $scaled = New-ArgbBitmap -Width 540 -Height 240
            for ($dy = 0; $dy -lt 240; $dy++) {
                $sy = [Math]::Min($cropHeight - 1, [int][Math]::Floor($dy * $cropHeight / 240.0))
                for ($dx = 0; $dx -lt 540; $dx++) {
                    $sx = [Math]::Min(419, [int][Math]::Floor($dx * 420 / 540.0))
                    $scaled.SetPixel($dx, $dy, $crop.GetPixel($sx, $sy))
                }
            }
            $graphics.DrawImageUnscaled($scaled, $panelX + 10, $panelY + 42)
            $scaled.Dispose()
            $crop.Dispose()
            $cell.Dispose()
            $graphics.DrawRectangle($pen, $panelX + 10, $panelY + 42, 539, 239)
            $graphics.DrawString(("{0} frame {1} - lower-body / feet" -f $direction.ToUpperInvariant(), $frame), $font, $brush, $panelX + 10, $panelY + 10)
        }
    }

    Save-Png -Bitmap $canvas -Path (Join-Path $OutputRoot 'v3-side-leg-check.png')
    $graphics.Dispose()
    $font.Dispose()
    $brush.Dispose()
    $pen.Dispose()
    $canvas.Dispose()
    $source.Dispose()
}

function Render-FootCheck {
    param([string]$SourcePath)

    $source = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $SourcePath).Path)
    $panelWidth = 600
    $panelHeight = 190
    $cropY = 300
    $cropHeight = 100
    $canvas = New-ArgbBitmap -Width ($panelWidth * 3) -Height ($panelHeight * 2)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $font = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 25, 35, 55))
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 210, 35, 55), 2)

    foreach ($row in 1, 2) {
        $direction = $directions[$row]
        foreach ($column in 0, 1, 2) {
            $frame = $frameLabels[$column]
            $x0 = $column * 420
            $y0 = $row * 400
            $panelX = $column * $panelWidth
            $panelY = ($row - 1) * $panelHeight
            Draw-Checkerboard -Graphics $graphics -X ($panelX + 10) -Y ($panelY + 38) -Width 580 -Height 140
            $cell = $source.Clone([System.Drawing.Rectangle]::new($x0, $y0, 420, 400), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            $crop = $cell.Clone([System.Drawing.Rectangle]::new(0, $cropY, 420, $cropHeight), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            $scaled = New-ArgbBitmap -Width 580 -Height 140
            for ($dy = 0; $dy -lt 140; $dy++) {
                $sy = [Math]::Min($cropHeight - 1, [int][Math]::Floor($dy * $cropHeight / 140.0))
                for ($dx = 0; $dx -lt 580; $dx++) {
                    $sx = [Math]::Min(419, [int][Math]::Floor($dx * 420 / 580.0))
                    $scaled.SetPixel($dx, $dy, $crop.GetPixel($sx, $sy))
                }
            }
            $graphics.DrawImageUnscaled($scaled, $panelX + 10, $panelY + 38)
            $scaled.Dispose()
            $crop.Dispose()
            $cell.Dispose()
            $graphics.DrawRectangle($pen, $panelX + 10, $panelY + 38, 579, 139)
            $graphics.DrawString(("{0} frame {1} - feet only" -f $direction.ToUpperInvariant(), $frame), $font, $brush, $panelX + 10, $panelY + 8)
        }
    }

    Save-Png -Bitmap $canvas -Path (Join-Path $OutputRoot 'v3-feet-check.png')
    $graphics.Dispose()
    $font.Dispose()
    $brush.Dispose()
    $pen.Dispose()
    $canvas.Dispose()
    $source.Dispose()
}

function Render-UpHeadCheck {
    param([string]$SourcePath)

    $source = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $SourcePath).Path)
    $panelWidth = 560
    $panelHeight = 260
    $cropHeight = 100
    $canvas = New-ArgbBitmap -Width ($panelWidth * 3) -Height $panelHeight
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $font = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 25, 35, 55))
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 210, 35, 55), 2)

    foreach ($column in 0, 1, 2) {
        $x0 = $column * 420
        $y0 = 1200
        $panelX = $column * $panelWidth
        Draw-Checkerboard -Graphics $graphics -X ($panelX + 10) -Y 38 -Width 540 -Height 190
        $cell = $source.Clone([System.Drawing.Rectangle]::new($x0, $y0, 420, 400), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $crop = $cell.Clone([System.Drawing.Rectangle]::new(0, 0, 420, $cropHeight), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $scaled = New-ArgbBitmap -Width 540 -Height 190
        for ($dy = 0; $dy -lt 190; $dy++) {
            $sy = [Math]::Min($cropHeight - 1, [int][Math]::Floor($dy * $cropHeight / 190.0))
            for ($dx = 0; $dx -lt 540; $dx++) {
                $sx = [Math]::Min(419, [int][Math]::Floor($dx * 420 / 540.0))
                $scaled.SetPixel($dx, $dy, $crop.GetPixel($sx, $sy))
            }
        }
        $graphics.DrawImageUnscaled($scaled, $panelX + 10, 38)
        $scaled.Dispose()
        $crop.Dispose()
        $cell.Dispose()
        $graphics.DrawRectangle($pen, $panelX + 10, 38, 539, 189)
        $graphics.DrawString(("UP frame {0} - head / headwear top" -f $column), $font, $brush, $panelX + 10, 8)
    }

    Save-Png -Bitmap $canvas -Path (Join-Path $OutputRoot 'v3-up-head-check.png')
    $graphics.Dispose()
    $font.Dispose()
    $brush.Dispose()
    $pen.Dispose()
    $canvas.Dispose()
    $source.Dispose()
}

$beforeDirectory = Join-Path $OutputRoot 'v3-before'
$afterDirectory = Join-Path $OutputRoot 'v3-after'
New-Item -ItemType Directory -Force -Path $beforeDirectory, $afterDirectory | Out-Null
$beforeMetrics = Render-Variant -SourcePath $Before -Variant 'before' -VariantDirectory $beforeDirectory -SourceCellWidth 374 -SourceCellHeight 352
$afterMetrics = Render-Variant -SourcePath $After -Variant 'after' -VariantDirectory $afterDirectory -SourceCellWidth 420 -SourceCellHeight 400
Render-SideLegCheck -SourcePath $After
Render-FootCheck -SourcePath $After
Render-UpHeadCheck -SourcePath $After

$report = [pscustomobject]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    before = [pscustomobject]@{
        source = $Before
        sourceCell = [pscustomobject]@{ width = 374; height = 352 }
        frames = $beforeMetrics
    }
    after = [pscustomobject]@{
        source = $After
        sourceCell = [pscustomobject]@{ width = 420; height = 400 }
        frames = $afterMetrics
    }
    validation = [pscustomobject]@{
        afterAllEdgesClear = (@($afterMetrics | Where-Object {
            $_.metrics.edgeAnyAlpha.top -ne 0 -or
            $_.metrics.edgeAnyAlpha.bottom -ne 0 -or
            $_.metrics.edgeAnyAlpha.left -ne 0 -or
            $_.metrics.edgeAnyAlpha.right -ne 0
        }).Count -eq 0)
        afterAllFramesNonEmpty = (@($afterMetrics | Where-Object { $_.metrics.opaquePixels -eq 0 }).Count -eq 0)
        afterMinimumPadding = [pscustomobject]@{
            top = ($afterMetrics | ForEach-Object { $_.metrics.padding.top } | Measure-Object -Minimum).Minimum
            bottom = ($afterMetrics | ForEach-Object { $_.metrics.padding.bottom } | Measure-Object -Minimum).Minimum
            left = ($afterMetrics | ForEach-Object { $_.metrics.padding.left } | Measure-Object -Minimum).Minimum
            right = ($afterMetrics | ForEach-Object { $_.metrics.padding.right } | Measure-Object -Minimum).Minimum
        }
    }
}
$report | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath (Join-Path $OutputRoot 'v3-report.json') -Encoding UTF8
Write-Output ("rendered {0} before and {1} after frames; wrote v3 side-leg check" -f $beforeMetrics.Count, $afterMetrics.Count)
