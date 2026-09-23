Add-Type -AssemblyName System.Drawing
$root=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$atlas=[Drawing.Bitmap]::new((Join-Path $root 'reference/runtime/jelly-anthropomorphic-player-walk-v8.png'))
$source=[Drawing.Bitmap]::new((Join-Path $PSScriptRoot 'opposite-pose-source.png'))
$legs=[Drawing.Bitmap]::new(440,300)
$lg=[Drawing.Graphics]::FromImage($legs)
$shape=[Drawing.Drawing2D.GraphicsPath]::new()
$coords=@(@(506,845),@(661,845),@(687,900),@(754,940),@(804,1000),@(850,1050),@(850,1150),@(400,1150),@(400,1060),@(483,1015),@(503,940))
$points=[Drawing.Point[]]@($coords | ForEach-Object {[Drawing.Point]::new($_[0]-400,$_[1]-850)})
$shape.AddPolygon($points);$lg.SetClip($shape)
$lg.DrawImage($source,[Drawing.Rectangle]::new(0,0,440,300),[Drawing.Rectangle]::new(400,850,440,300),[Drawing.GraphicsUnit]::Pixel)
$lg.Dispose();$shape.Dispose()
$g=[Drawing.Graphics]::FromImage($atlas)
$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$cut=@(@(176,306),@(192,310),@(213,305),@(229,307),@(244,311),@(257,315),@(278,335),@(285,345),@(283,378),@(270,389),@(122,392),@(121,349),@(153,342),@(166,323))
foreach($row in @(1,2)){
 $shape=[Drawing.Drawing2D.GraphicsPath]::new()
 $points=[Drawing.Point[]]@($cut | ForEach-Object { $x=$_[0];if($row -eq 2){$x=420-$x};[Drawing.Point]::new(840+$x,400*$row+$_[1]) })
 $shape.AddPolygon($points)
 $g.CompositingMode=[Drawing.Drawing2D.CompositingMode]::SourceCopy
 $g.FillPath([Drawing.Brushes]::Transparent,$shape)
 $g.CompositingMode=[Drawing.Drawing2D.CompositingMode]::SourceOver
 if($row -eq 2){$legs.RotateFlip([Drawing.RotateFlipType]::RotateNoneFlipX)}
 $x=143;if($row -eq 2){$x=420-143-123.2}
 $g.DrawImage($legs,[Drawing.RectangleF]::new(840+$x,400*$row+302,123.2,84))
 $shape.Dispose()
}
$g.Dispose();$legs.Dispose();$source.Dispose()
$atlas.Save((Join-Path $root 'reference/runtime/jelly-anthropomorphic-player-walk-v9.png'),[Drawing.Imaging.ImageFormat]::Png)
$a=[Drawing.Bitmap]::new(840,1600);$g=[Drawing.Graphics]::FromImage($a);$g.Clear([Drawing.Color]::FromArgb(222,240,240));$g.DrawImage($atlas,[Drawing.Rectangle]::new(0,0,840,800),[Drawing.Rectangle]::new(840,400,420,400),[Drawing.GraphicsUnit]::Pixel);$g.DrawImage($atlas,[Drawing.Rectangle]::new(0,800,840,800),[Drawing.Rectangle]::new(840,800,420,400),[Drawing.GraphicsUnit]::Pixel);$a.Save((Join-Path $PSScriptRoot 'opposite-check.png'));$g.Dispose();$a.Dispose();$atlas.Dispose()
