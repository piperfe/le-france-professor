/**
 * Figma Plugin Script - WhatsApp Format v2
 *
 * Creates a "WhatsApp Format v2" section showing the unified message style:
 *   - Error messages (unknown command, missing word, invalid notebook)
 *   - Happy path (/vocabulary reply, /notebook reply)
 *
 * How to run:
 *   Figma -> Plugins -> Scripter -> paste & run
 */

await Promise.all([
  figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Medium' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Bold' }),
  figma.loadFontAsync({ family: 'Inter', style: 'Italic' }),
]);

const h = hex => ({
  r: parseInt(hex.slice(1,3),16)/255,
  g: parseInt(hex.slice(3,5),16)/255,
  b: parseInt(hex.slice(5,7),16)/255,
});
const C = {
  bg:        h('#0B141A'),
  waHeader:  h('#1F2C34'),
  bubbleIn:  h('#202C33'),
  bubbleOut: h('#005C4B'),
  text:      h('#E9EDE0'),
  textDim:   h('#8696A0'),
  white:     h('#FFFFFF'),
  black:     h('#000000'),
  border:    h('#D8D2C8'),
  vocab:     h('#5C4A8A'),
  blue:      h('#002395'),
  rouge:     h('#ED2939'),
  ink:       h('#1A1714'),
  inkMuted:  h('#6B6560'),
  cream:     h('#F7F4EF'),
};
const PG = figma.currentPage;

const mkRect = (w, hh, color, r=0) => {
  const n = figma.createRectangle();
  n.resize(w, hh); n.fills=[{type:'SOLID',color}]; n.cornerRadius=r; return n;
};
const mkText = (str, size, color, style='Regular', wrap=0) => {
  const n = figma.createText();
  n.fontName={family:'Inter',style}; n.fontSize=size; n.characters=str;
  n.fills=[{type:'SOLID',color}];
  if(wrap>0){n.textAutoResize='HEIGHT';n.resize(wrap,10);}
  return n;
};
const mkFrame = (w, hh, color, r=0, clip=true) => {
  const n = figma.createFrame();
  n.resize(w,hh); n.fills=color?[{type:'SOLID',color}]:[];
  n.cornerRadius=r; n.clipsContent=clip; return n;
};

function buildPhoneShell(name, x, y, phoneW) {
  phoneW = phoneW || 295;
  const frame = mkFrame(phoneW, 700, C.bg, 28);
  frame.name=name; frame.x=x; frame.y=y;
  PG.appendChild(frame);
  const notchBar=mkFrame(phoneW,32,C.waHeader); notchBar.x=0;notchBar.y=0; frame.appendChild(notchBar);
  const waHead=mkFrame(phoneW,52,C.waHeader); waHead.x=0;waHead.y=32; frame.appendChild(waHead);
  const avatar=mkRect(34,34,C.blue,17); avatar.x=12;avatar.y=9; waHead.appendChild(avatar);
  const avatarTxt=mkText('🇨🇷',14,C.white); avatarTxt.x=8;avatarTxt.y=8; waHead.appendChild(avatarTxt);
  const cname=mkText('Le France Professor',13,C.text,'Semi Bold'); cname.x=54;cname.y=9; waHead.appendChild(cname);
  const cstatus=mkText('en ligne',10,C.textDim); cstatus.x=54;cstatus.y=27; waHead.appendChild(cstatus);
  const inputBar=mkRect(phoneW,50,C.waHeader); inputBar.x=0;inputBar.y=650; frame.appendChild(inputBar);
  const inputTxt=mkText('Message',11,C.textDim); inputTxt.x=20;inputTxt.y=663; frame.appendChild(inputTxt);
  return {frame: frame, chatY: 92};
}

function addBubble(pf, phoneW, y, lines, out) {
  const bw=Math.round(phoneW*0.82), padH=10, padV=7, textW=bw-padH*2;
  const tmp=mkText(lines.join('\n'),12,C.text,'Regular',textW);
  const th=tmp.height; tmp.remove();
  const bubble=mkFrame(bw,padV+th+4+14+padV,out?C.bubbleOut:C.bubbleIn,8);
  bubble.x=out?phoneW-bw-8:8; bubble.y=y; pf.appendChild(bubble);
  const tn=figma.createText();
  tn.fontName={family:'Inter',style:'Regular'}; tn.fontSize=12;
  tn.textAutoResize='HEIGHT'; tn.resize(textW,10);
  tn.x=padH; tn.y=padV; tn.characters=lines.join('\n');
  tn.fills=[{type:'SOLID',color:C.text}];
  const boldRe=/\*([^*]+)\*/g; let m;
  while((m=boldRe.exec(tn.characters))!==null){
    tn.setRangeFontName(m.index,m.index+m[0].length,{family:'Inter',style:'Bold'});
  }
  const italRe=/_([^_]+)_/g;
  while((m=italRe.exec(tn.characters))!==null){
    tn.setRangeFontName(m.index,m.index+m[0].length,{family:'Inter',style:'Italic'});
    tn.setRangeFills(m.index,m.index+m[0].length,[{type:'SOLID',color:C.textDim}]);
  }
  bubble.appendChild(tn);
  const time=mkText('10:14',9,C.textDim); time.resize(textW,12);
  time.x=padH; time.y=padV+tn.height+4; bubble.appendChild(time);
  bubble.resize(bw,padV+tn.height+4+14+padV);
  return y+bubble.height+6;
}

function addDateChip(pf, phoneW, y) {
  const c=mkText("Aujourd'hui",10,C.textDim); c.textAlignHorizontal='CENTER';
  c.resize(phoneW,14); c.x=0; c.y=y; pf.appendChild(c); return y+20;
}

const old=PG.findOne(function(n){return n.name==='WhatsApp Format v2';});
if(old) old.remove();

const SX=200, SY=200, PW=295, GAP=48;

// Phone 1: Error messages
const ph1=buildPhoneShell('📱 Erreurs - commandes invalides', SX, SY, PW);
let y1=ph1.chatY+6;
y1=addDateChip(ph1.frame,PW,y1);
y1=addBubble(ph1.frame,PW,y1,['/notebookfoo'],true);
y1=addBubble(ph1.frame,PW,y1,['📖 *Utilisation :*','• /notebook','• /notebook all'],false);
y1+=4;
y1=addBubble(ph1.frame,PW,y1,['/vocabulary'],true);
y1=addBubble(ph1.frame,PW,y1,['📚 *Utilisation*, indique un mot à expliquer *:*','• /vocabulary bonjour','• /vocabulary se passer'],false);
y1+=4;
y1=addBubble(ph1.frame,PW,y1,['/inconnu'],true);
y1=addBubble(ph1.frame,PW,y1,['❓ *Commande inconnue.*','Commandes disponibles :','• /vocabulary [mot]','• /notebook','• /notebook all'],false);

// Phone 2: /vocabulary
const ph2=buildPhoneShell('📱 /vocabulary bonjour', SX+PW+GAP, SY, PW);
let y2=ph2.chatY+6;
y2=addDateChip(ph2.frame,PW,y2);
y2=addBubble(ph2.frame,PW,y2,['Tu veux pratiquer ton français ? Dis-moi, comment ça va ?'],false);
y2+=4;
y2=addBubble(ph2.frame,PW,y2,['Bonjour ! Je suis content.'],true);
y2+=4;
y2=addBubble(ph2.frame,PW,y2,['Bonjour ! Très bien. Tu sais, « content » est un adjectif très courant.'],false);
y2+=4;
y2=addBubble(ph2.frame,PW,y2,['/vocabulary bonjour'],true);
y2+=4;
y2=addBubble(ph2.frame,PW,y2,['📚 *bonjour* 🇨🇷','','Salutation courante utilisée le matin et tout au long de la journée. Vient du vieux français « bon jour ».'],false);

// Phone 3: /notebook
const ph3=buildPhoneShell('📱 /notebook', SX+(PW+GAP)*2, SY, PW);
let y3=ph3.chatY+6;
y3=addDateChip(ph3.frame,PW,y3);
y3=addBubble(ph3.frame,PW,y3,['/notebook'],true);
y3+=4;
y3=addBubble(ph3.frame,PW,y3,[
  '📖 *Vocabulaire* 🇨🇷 - 4 mots au total','',
  '*incontournable*',"Essentiel, qu'on ne peut pas éviter.",
  "_Aujourd'hui, 10:14_",'▫️',
  '*provençal·e*','Qui vient de la Provence.',
  '_Il y a 2 jours, 09:30_','',
  '_+ 2 mots · /notebook all pour tout voir_'
],false);
y3+=4;
const pdfBw=Math.round(PW*0.82);
const pdfB=mkFrame(pdfBw,60,C.bubbleIn,8); pdfB.x=8; pdfB.y=y3; ph3.frame.appendChild(pdfB);
const pdfIcon=mkRect(36,36,C.rouge,6); pdfIcon.x=10;pdfIcon.y=12; pdfB.appendChild(pdfIcon);
const pdfTxt=mkText('PDF',9,C.white,'Bold'); pdfTxt.x=14;pdfTxt.y=22; pdfB.appendChild(pdfTxt);
const pdfName=mkText('carnet-vocabulaire-2026-05-22.pdf',10,C.text,'Medium',pdfBw-60); pdfName.x=54;pdfName.y=14; pdfB.appendChild(pdfName);
const pdfSz=mkText('12 Ko',9,C.textDim); pdfSz.x=54;pdfSz.y=36; pdfB.appendChild(pdfSz);

// Style guide panel
const guideX=SX+(PW+GAP)*3, guideW=340;
const gf=mkFrame(guideW,500,C.white,10); gf.name='📋 Style Guide';
gf.x=guideX; gf.y=SY;
gf.strokes=[{type:'SOLID',color:C.border}]; gf.strokeWeight=1;
PG.appendChild(gf);
let gy=24;
const gt=mkText('Format WhatsApp v2',14,C.ink,'Bold',guideW-40); gt.x=20;gt.y=gy; gf.appendChild(gt); gy+=gt.height+6;
const gs=mkText('Conventions unifiées pour toutes les réponses du bot',10,C.inkMuted,'Regular',guideW-40); gs.x=20;gs.y=gy; gf.appendChild(gs); gy+=gs.height+20;
const gd1=mkRect(guideW-40,1,C.border); gd1.x=20;gd1.y=gy; gf.appendChild(gd1); gy+=12;
const rows=[
  {l:'📚 + 📖', d:'Emoji ouvreur - identifie le domaine'},
  {l:'*mot*',     d:'Gras - mot clé, label Utilisation'},
  {l:'_texte_',   d:'Italique - date, tag, hint discret'},
  {l:'• item',    d:'Bullet list - exemples et commandes'},
  {l:'▫️', d:'Séparateur entre entrées du carnet'},
  {l:'PDF attach',d:'Joint quand le carnet n\'est pas vide'},
];
for(let i=0;i<rows.length;i++){
  const row=rows[i];
  const ln=mkText(row.l,12,C.vocab,'Bold'); ln.x=20;ln.y=gy; gf.appendChild(ln);
  const dn=mkText(row.d,10,C.inkMuted,'Regular',guideW-110); dn.x=100;dn.y=gy+1; gf.appendChild(dn);
  gy+=Math.max(ln.height,dn.height)+12;
}
gy+=4;
const gd2=mkRect(guideW-40,1,C.border); gd2.x=20;gd2.y=gy; gf.appendChild(gd2); gy+=16;
const sigTit=mkText('Signatures des commandes',11,C.ink,'Semi Bold'); sigTit.x=20;sigTit.y=gy; gf.appendChild(sigTit); gy+=sigTit.height+10;
const sigs=[
  '📚 *Utilisation*, indique un mot à expliquer *:*',
  '📖 *Utilisation :*',
  '❓ *Commande inconnue.*',
];
for(let i=0;i<sigs.length;i++){
  const sn=mkText(sigs[i],10,C.inkMuted,'Italic',guideW-40); sn.x=20;sn.y=gy; gf.appendChild(sn); gy+=sn.height+8;
}
gf.resize(guideW,gy+24);

// Section wrapper
const section=figma.createSection();
section.name='WhatsApp Format v2';
const allN=[ph1.frame,ph2.frame,ph3.frame,gf];
const pad=60;
const mnX=Math.min.apply(null,allN.map(function(n){return n.x;}))-pad;
const mnY=Math.min.apply(null,allN.map(function(n){return n.y;}))-48;
const mxX=Math.max.apply(null,allN.map(function(n){return n.x+n.width;}))+pad;
const mxY=Math.max.apply(null,allN.map(function(n){return n.y+n.height;}))+pad;
section.x=mnX; section.y=mnY;
section.resize(mxX-mnX,mxY-mnY);
PG.appendChild(section);
for(let i=0;i<allN.length;i++){
  const node=allN[i], nx=node.x, ny=node.y;
  section.appendChild(node); node.x=nx-mnX; node.y=ny-mnY;
}
figma.viewport.scrollAndZoomIntoView([section]);
