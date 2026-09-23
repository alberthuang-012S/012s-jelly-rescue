Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.Linq;
public static class WalkAtlas {
  class Piece { public Bitmap Art; public int X,Y; public double CrestX,CrestY; }
  static List<Piece> Pieces(string path) {
    using(var b = new Bitmap(path)) {
      int w=b.Width,h=b.Height;
      var pixels=new Color[w*h];var visited=new bool[w*h];
      for(int y=0;y<h;y++)for(int x=0;x<w;x++)pixels[y*w+x]=b.GetPixel(x,y);
      var found=new List<Piece>();
      for(int start=0;start<pixels.Length;start++) {
        if(visited[start]||pixels[start].A<96)continue;
        var queue=new List<int>();queue.Add(start);visited[start]=true;
        int minX=w,minY=h,maxX=0,maxY=0;
        for(int head=0;head<queue.Count;head++) {
          int p=queue[head],x=p%w,y=p/w;
          minX=Math.Min(minX,x);maxX=Math.Max(maxX,x);minY=Math.Min(minY,y);maxY=Math.Max(maxY,y);
          int[] neighbors={x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1};
          foreach(int n in neighbors)if(n>=0&&!visited[n]&&pixels[n].A>=96){visited[n]=true;queue.Add(n);}
        }
        if(queue.Count<2000)continue;
        minX=Math.Max(0,minX-3);minY=Math.Max(0,minY-3);maxX=Math.Min(w-1,maxX+3);maxY=Math.Min(h-1,maxY+3);
        var art=new Bitmap(maxX-minX+1,maxY-minY+1,PixelFormat.Format32bppArgb);
        var keep=new HashSet<int>();
        foreach(int p in queue)for(int dy=-2;dy<=2;dy++)for(int dx=-2;dx<=2;dx++){
          int x=p%w+dx,y=p/w+dy;if(x>=minX&&x<=maxX&&y>=minY&&y<=maxY)keep.Add(y*w+x);
        }
        double cx=0,cy=0,count=0;
        foreach(int p in keep){int x=p%w-minX,y=p/w-minY;var c=pixels[p];art.SetPixel(x,y,c);
          if(y<art.Height*.25&&c.A>180&&c.B-c.R>65&&c.G>90){cx+=x;cy+=y;count++;}}
        found.Add(new Piece{Art=art,X=minX,Y=minY,CrestX=cx/count,CrestY=cy/count});
      }
      return found;
    }
  }
  public static void Build(string root) {
    var full=Pieces(root+"/qa/walk-v5/front-back-source.png");
    var sides=Pieces(root+"/qa/walk-v12/repair-source.png"); if(sides.Count!=16)throw new Exception("Expected sixteen poses"); var left=sides.OrderBy(p=>p.Y).Skip(4).Take(4).OrderBy(p=>p.X).ToList();
    var right=sides.OrderBy(p=>p.Y).Skip(8).Take(4).OrderBy(p=>p.X).ToList();
    Console.WriteLine("Components: atlas="+full.Count+" left="+left.Count+" right="+right.Count);
    if(full.Count!=12||left.Count!=4||right.Count!=4)throw new Exception("Unexpected sprite component count");
    var down=full.OrderBy(p=>p.Y).Take(3).OrderBy(p=>p.X).ToList();
    var up=full.OrderByDescending(p=>p.Y).Take(3).OrderBy(p=>p.X).ToList();
    var rows=new[]{down,left,right,up};
    using(var atlas=new Bitmap(1680,1600,PixelFormat.Format32bppArgb))
    using(var g=Graphics.FromImage(atlas)) {
      g.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
      for(int row=0;row<4;row++) {
        // One scale per direction keeps the head size stable between poses.
        double scale=356.0/rows[row].Max(p=>p.Art.Height);
        var neutral=rows[row][1];
        double crestTargetY=386-(neutral.Art.Height-neutral.CrestY)*scale;
        for(int frame=0;frame<4;frame++) {
          var p=rows[row][frame==3&&rows[row].Count==3?1:frame];
          float x=(float)(frame*420+210-p.CrestX*scale);
          float y=(float)(row*400+crestTargetY-p.CrestY*scale);
          var rect=new RectangleF(x,y,(float)(p.Art.Width*scale),(float)(p.Art.Height*scale));
          if(x<frame*420+3||rect.Right>(frame+1)*420-3||y<row*400+3||rect.Bottom>(row+1)*400-3)throw new Exception("Frame exceeds safe padding");
          g.DrawImage(p.Art,rect);
        }
      }
      atlas.Save(root+"/reference/runtime/jelly-anthropomorphic-player-walk-v12.png",ImageFormat.Png);
      using(var audit=new Bitmap(1680,1600))using(var a=Graphics.FromImage(audit)){
        a.Clear(Color.FromArgb(223,239,239));a.DrawImageUnscaled(atlas,0,0);
        using(var pen=new Pen(Color.LightSteelBlue)){for(int x=0;x<=1680;x+=420)a.DrawLine(pen,x,0,x,1600);for(int y=0;y<=1600;y+=400)a.DrawLine(pen,0,y,1680,y);}
        audit.Save(root+"/qa/walk-v12/contact-sheet.png",ImageFormat.Png);
      }
    }
    foreach(var p in full.Concat(left).Concat(right))p.Art.Dispose();
  }
}
"@
[WalkAtlas]::Build((Resolve-Path (Join-Path $PSScriptRoot '../..')).Path)


