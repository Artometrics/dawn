from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, black, white
W,H=letter
ACC=HexColor("#1F6F5C"); GREY=HexColor("#6B6B6B"); LIGHT=HexColor("#E6E6E6")
out="/workspace/invoices/Artometrics-Invoice-2026-001.pdf"
c=canvas.Canvas(out,pagesize=letter)
c.setTitle("Artometrics Invoice ART-2026-001"); c.setAuthor("Artometrics")
M=60
# header
c.setFillColor(ACC); c.rect(0,H-8,W,8,fill=1,stroke=0)
c.setFillColor(black); c.setFont("Helvetica-Bold",26); c.drawString(M,H-75,"ARTOMETRICS")
c.setFont("Helvetica",10); c.setFillColor(GREY)
c.drawString(M,H-92,"Kyle McAuliffe Studio"); c.drawString(M,H-106,"team@artometrics.com")
c.setFillColor(black); c.setFont("Helvetica-Bold",20); c.drawRightString(W-M,H-75,"INVOICE / RECEIPT")
c.setFont("Helvetica",10)
rows=[("Invoice No.","ART-2026-001"),("Invoice Date","Oct 27, 2026"),("Status","PAID")]
y=H-95
for k,v in rows:
    c.setFillColor(GREY); c.drawRightString(W-M-95,y,k)
    c.setFillColor(ACC if v=="PAID" else black); c.setFont("Helvetica-Bold" if v=="PAID" else "Helvetica",10)
    c.drawRightString(W-M,y,v); c.setFont("Helvetica",10); y-=14
c.setStrokeColor(LIGHT); c.setLineWidth(1); c.line(M,H-140,W-M,H-140)
# bill to
c.setFillColor(ACC); c.setFont("Helvetica-Bold",9); c.drawString(M,H-165,"BILL TO")
c.setFillColor(black); c.setFont("Helvetica-Bold",13); c.drawString(M,H-183,"Thief & Co.")
c.setFont("Helvetica",10); c.drawString(M,H-198,"Attn: Madison McFarland")
c.setFillColor(GREY); c.drawString(M,H-212,"Instagram: @madisonjmcfarland  ·  @flower.thief")
# table
ty=H-260
c.setFillColor(black); c.rect(M,ty-6,W-2*M,22,fill=1,stroke=0)
c.setFillColor(white); c.setFont("Helvetica-Bold",9)
c.drawString(M+10,ty+2,"#"); c.drawString(M+30,ty+2,"DESCRIPTION")
c.drawRightString(W-M-120,ty+2,"QTY"); c.drawRightString(W-M-60,ty+2,"RATE"); c.drawRightString(W-M-10,ty+2,"AMOUNT")
items=[("London on da Track — 57th NAACP Image Awards / BET dinner","Posted Oct 20, 2026"),
("Sheryl Lee Ralph — Divas Simply Singing","Scheduled Fri, Nov 6, 2026, 9:00 AM PT"),
("Courtney LaPlante / Spiritbox — tour wardrobe","Scheduled Thu, Nov 5, 2026, 9:00 AM PT")]
y=ty-30
for i,(t,d) in enumerate(items,1):
    c.setFillColor(black); c.setFont("Helvetica",10); c.drawString(M+10,y,str(i))
    c.setFont("Helvetica-Bold",10); c.drawString(M+30,y,"Instagram post package")
    c.setFont("Helvetica",10); c.drawString(M+30,y-14,t)
    c.setFillColor(GREY); c.setFont("Helvetica",8.5); c.drawString(M+30,y-27,d)
    c.setFillColor(black); c.setFont("Helvetica",10)
    c.drawRightString(W-M-120,y,"1"); c.drawRightString(W-M-60,y,"$20.00"); c.drawRightString(W-M-10,y,"$20.00")
    c.setStrokeColor(LIGHT); c.line(M,y-38,W-M,y-38); y-=56
c.setFillColor(GREY); c.setFont("Helvetica-Oblique",8.5)
c.drawString(M+10,y+6,"Each package includes: caption, verified credits, people tags, collaborator setup, music & location research.")
# totals
y-=25; x1=W-M-170
def tl(label,val,bold=False,col=black,size=10):
    global y
    c.setFillColor(GREY if not bold else col); c.setFont("Helvetica-Bold" if bold else "Helvetica",size); c.drawString(x1,y,label)
    c.setFillColor(col); c.drawRightString(W-M-10,y,val); y-=18
tl("Subtotal","$60.00"); tl("Tax","$0.00")
c.setStrokeColor(black); c.line(x1,y+12,W-M,y+12); y-=4
tl("Total","$60.00",True,black,12)
tl("Payment received (Oct 27, 2026, 12:30 PM PT)","−$60.00",False,ACC,9) if False else None
c.setFillColor(GREY); c.setFont("Helvetica",10); c.drawString(x1,y,"Payment received"); c.setFillColor(ACC); c.drawRightString(W-M-10,y,"−$60.00")
c.setFillColor(GREY); c.setFont("Helvetica",8); c.drawString(x1,y-11,"Oct 27, 2026 · 12:30 PM PT"); y-=30
c.setFillColor(ACC); c.rect(x1-8,y-8,W-M-x1+8,24,fill=1,stroke=0)
c.setFillColor(white); c.setFont("Helvetica-Bold",11); c.drawString(x1,y,"Balance Due"); c.drawRightString(W-M-10,y,"$0.00")
# PAID stamp
c.saveState(); c.translate(M+130,y+40); c.rotate(14)
c.setStrokeColor(ACC); c.setFillColor(ACC); c.setLineWidth(4)
c.roundRect(-95,-32,190,64,8,fill=0,stroke=1); c.setLineWidth(1.2); c.roundRect(-88,-25,176,50,6,fill=0,stroke=1)
c.setFont("Helvetica-Bold",40); c.drawCentredString(0,-6,"PAID")
c.setFont("Helvetica-Bold",7.5); c.drawCentredString(0,-19,"OCT 27, 2026  ·  12:30 PM PT")
c.restoreState()
# footer
c.setStrokeColor(LIGHT); c.line(M,90,W-M,90)
c.setFillColor(black); c.setFont("Helvetica-Bold",10); c.drawString(M,72,"Thank you for your business.")
c.setFillColor(GREY); c.setFont("Helvetica",9)
c.drawString(M,58,"This invoice has been paid in full. Questions: team@artometrics.com")
c.drawRightString(W-M,58,"ART-2026-001")
c.setFillColor(ACC); c.rect(0,0,W,8,fill=1,stroke=0)
c.save(); print(out)
