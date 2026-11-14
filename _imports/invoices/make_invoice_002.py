from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, black, white
W,H=letter
ACC=HexColor("#1F6F5C"); GREY=HexColor("#6B6B6B"); LIGHT=HexColor("#E6E6E6")
out="/workspace/invoices/Artometrics-Invoice-ART-2026-002-November.pdf"
c=canvas.Canvas(out,pagesize=letter)
c.setTitle("Artometrics Invoice ART-2026-002"); c.setAuthor("Artometrics")
M=60
c.setFillColor(ACC); c.rect(0,H-8,W,8,fill=1,stroke=0)
c.setFillColor(black); c.setFont("Helvetica-Bold",26); c.drawString(M,H-75,"ARTOMETRICS")
c.setFont("Helvetica",10); c.setFillColor(GREY)
c.drawString(M,H-92,"Kyle McAuliffe Studio"); c.drawString(M,H-106,"team@artometrics.com")
c.setFillColor(black); c.setFont("Helvetica-Bold",20); c.drawRightString(W-M,H-75,"INVOICE")
c.setFont("Helvetica",10)
y=H-95
for k,v in [("Invoice No.","ART-2026-002"),("Invoice Date","Nov 11, 2026"),("Period","November 2026"),("Due","On receipt")]:
    c.setFillColor(GREY); c.drawRightString(W-M-95,y,k); c.setFillColor(black); c.drawRightString(W-M,y,v); y-=14
c.setStrokeColor(LIGHT); c.line(M,H-160,W-M,H-160)
c.setFillColor(ACC); c.setFont("Helvetica-Bold",9); c.drawString(M,H-180,"BILL TO")
c.setFillColor(black); c.setFont("Helvetica-Bold",13); c.drawString(M,H-197,"Thief & Co.")
c.setFont("Helvetica",10); c.drawString(M,H-211,"Attn: Madison McFarland")
c.setFillColor(GREY); c.drawString(M,H-225,"Instagram: @madisonjmcfarland  ·  @flower.thief")
ty=H-262
c.setFillColor(black); c.rect(M,ty-6,W-2*M,20,fill=1,stroke=0)
c.setFillColor(white); c.setFont("Helvetica-Bold",9)
c.drawString(M+10,ty,"#"); c.drawString(M+30,ty,"INSTAGRAM POST PACKAGE"); c.drawString(M+300,ty,"DATE")
c.drawRightString(W-M-70,ty,"RATE"); c.drawRightString(W-M-10,ty,"AMOUNT")
items=[("Luna — Lucky Secret music video","Posted Nov 9"),
("Isa Briones — 2026 Emmys gown","Posted Nov 11"),
("Angela Benson — 2026 GRAMMYs","Sched. Fri Nov 13"),
("Isa Briones — THR + SAG pre-Emmys party","Sched. Mon Nov 16"),
("Sheléa — LA Area Emmys","Sched. Wed Nov 18"),
("Esodette — Glamour Hungary editorial","Sched. Fri Nov 20"),
("Matt B — At the End of the Door, Elmina","Sched. Mon Nov 23"),
("Ivy Coco — Fortune & Forks Gala","Sched. Wed Nov 25"),
("Pandora Nox — music video BTS","Sched. Fri Nov 27"),
("Sheryl Lee Ralph — 2026 Emmys, Sergio Hudson","Sched. Mon Nov 30")]
y=ty-24
for i,(t,d) in enumerate(items,1):
    c.setFillColor(black); c.setFont("Helvetica",9.5)
    c.drawString(M+10,y,str(i)); c.drawString(M+30,y,t)
    c.setFillColor(GREY); c.drawString(M+300,y,d); c.setFillColor(black)
    c.drawRightString(W-M-70,y,"$20.00"); c.drawRightString(W-M-10,y,"$20.00")
    c.setStrokeColor(LIGHT); c.line(M,y-8,W-M,y-8); y-=24
c.setFillColor(GREY); c.setFont("Helvetica-Oblique",8.5)
c.drawString(M+10,y,"Each package: caption, verified credits, people tags, collaborator setup, music and location research.")
y-=34; x1=W-M-170
def tl(label,val,bold=False,size=10):
    global y
    c.setFillColor(black if bold else GREY); c.setFont("Helvetica-Bold" if bold else "Helvetica",size); c.drawString(x1,y,label)
    c.setFillColor(black); c.drawRightString(W-M-10,y,val); y-=18
tl("Subtotal (10 × $20)","$200.00"); tl("Tax","$0.00")
c.setStrokeColor(black); c.line(x1,y+12,W-M,y+12); y-=6
c.setFillColor(ACC); c.rect(x1-8,y-8,W-M-x1+8,24,fill=1,stroke=0)
c.setFillColor(white); c.setFont("Helvetica-Bold",11); c.drawString(x1,y,"Balance Due"); c.drawRightString(W-M-10,y,"$200.00")
c.setStrokeColor(LIGHT); c.line(M,90,W-M,90)
c.setFillColor(black); c.setFont("Helvetica-Bold",10); c.drawString(M,72,"Thank you for your business.")
c.setFillColor(GREY); c.setFont("Helvetica",9); c.drawString(M,58,"Questions: team@artometrics.com"); c.drawRightString(W-M,58,"ART-2026-002")
c.setFillColor(ACC); c.rect(0,0,W,8,fill=1,stroke=0)
c.save(); print(out)
