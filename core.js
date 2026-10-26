/* Planning Travail — calculs civils en UTC, sans dépendance. */
(function(root){
'use strict';
const DAY=86400000, MIN='2026-01-01', MAX='2050-12-31';
const TYPES=['CA','CAHP','RTT','RPS','CF','CET','HS','CMO'];
const RIGHTS={CA:18,CAHP:0,RTT:15.5,RPS:0,CF:9};
const DEFAULT={anchor:'2026-10-19',first:'Nuit',changes:[],rights:{},cahpManual:{},rpsStart:'2026-10-19',rpsOpening:0,retirement:'',Jour:{start:'07:00',end:'19:08'},Nuit:{start:'19:00',end:'07:08'}};
function date(s){return new Date(s+'T00:00:00Z')}
function key(d){return d.toISOString().slice(0,10)}
function add(s,n){return key(new Date(date(s).getTime()+n*DAY))}
function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(date(s).getTime())&&key(date(s))===s}
function inRange(s){return validDate(s)&&s>=MIN&&s<=MAX}
function duration(t){const m=s=>Number(s.slice(0,2))*60+Number(s.slice(3));return (m(t.end)-m(t.start)+1440)%1440}
function shift(s,c=DEFAULT){
 const active=(c.changes||[]).filter(x=>x.from<=s).sort((a,b)=>a.from.localeCompare(b.from)).at(-1)||c;
 const offset=((Math.round((date(s)-date(active.anchor))/DAY)%28)+28)%28;
 const worked=[0,1,4,5,6,9,10].includes(offset%14);
 const type=offset<14?active.first:(active.first==='Nuit'?'Jour':'Nuit');
 return {offset,worked,type:worked?type:'Repos',period:type,minutes:worked?duration(c[type]):0,week:offset%14<7?'Grande semaine':'Petite semaine',time:worked?c[type].start+'–'+c[type].end:''};
}
function range(a,b){const out=[];for(let s=a;s<=b;s=add(s,1))out.push(s);return out}
function easterSunday(year){const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;return key(new Date(Date.UTC(year,month-1,day)))}
function frenchHolidayNames(year){const easter=easterSunday(year);return Object.fromEntries([[year+'-01-01','Jour de l’an'],[add(easter,1),'Lundi de Pâques'],[year+'-05-01','Fête du Travail'],[year+'-05-08','Victoire 1945'],[add(easter,39),'Ascension'],[add(easter,50),'Lundi de Pentecôte'],[year+'-07-14','Fête nationale'],[year+'-08-15','Assomption'],[year+'-11-01','Toussaint'],[year+'-11-11','Armistice'],[year+'-12-25','Noël']])}
function holidayName(day){return frenchHolidayNames(Number(day.slice(0,4)))[day]||''}

function parseRpsHours(raw){
 raw=String(raw).trim();let minutes;
 const clock=raw.match(/^(-?)(\d+):([0-5]\d)$/);
 if(clock)minutes=(Number(clock[2])*60+Number(clock[3]))*(clock[1]?-1:1);
 else if(/^-?\d+(?:[.,]\d{1,6})?$/.test(raw))minutes=Number(raw.replace(',','.'))*60;
 else throw Error('Saisissez des heures (ex. 120,5) ou heures:minutes (ex. 120:30).');
 if(!Number.isFinite(minutes)||Math.abs(minutes)>7280000)throw Error('Solde RPS trop élevé.');
 return minutes/728;
}
function leaveType(v){return typeof v==='string'?v:v?.type||''}
function leaveAmount(v){return !v?0:typeof v==='string'?1:0.5}
function leaveLabel(v){return leaveType(v)+(leaveAmount(v)===0.5?' ½':'')}
function workedIntervals(d,c,leave){
 const sh=shift(d,c);if(!sh.worked||leaveAmount(leave)===1)return [];
 const t=c[sh.type].start.split(':').map(Number);
 let start=date(d).getTime()+ (t[0]*60+t[1])*60000,end=start+sh.minutes*60000;
 if(leaveAmount(leave)===0.5){if(leave.part==='first')start+=(end-start)/2;else end-=(end-start)/2}
 return [[start,end]];
}
function summary(days,c,leaves){let services=0,minutes=0,actual=0,absences=0,off=0;const counts=Object.fromEntries(TYPES.map(t=>[t,0]));for(const d of days){const s=shift(d,c),q=leaveAmount(leaves[d]);if(s.worked){services++;minutes+=s.minutes;absences+=q;actual+=s.minutes*(1-q)}else off++;if(leaves[d])counts[leaveType(leaves[d])]+=q}return {services,minutes,actual,absences,off,counts}}
function weekendFree(s,c,leaves){
 if(date(s).getUTCDay()!==6)return false;
 const a=date(s).getTime(),b=a+2*DAY;
 return [add(s,-1),s,add(s,1)].every(d=>workedIntervals(d,c,leaves[d]).every(([x,y])=>y<=a||x>=b));
}
function cahpForYear(year,c,leaves={}){
 let eligible=0;for(const [d,v] of Object.entries(leaves)){const md=d.slice(5);if(d.startsWith(year+'-')&&leaveType(v)==='CA'&&(md<='04-30'||md>='11-01')&&shift(d,c).worked)eligible+=leaveAmount(v)}
 return {eligible,earned:eligible>=8?2:eligible>=5?1:0};
}
function rttCmo(year,c,leaves={}){const base=(c.rights||{})[year]?.RTT??RIGHTS.RTT,days=range(year+'-01-01',year+'-12-31').filter(d=>shift(d,c).worked).length,threshold=days/(base||1);let absent=0;for(const [d,v] of Object.entries(leaves))if(d.startsWith(year+'-')&&leaveType(v)==='CMO'&&shift(d,c).worked)absent+=leaveAmount(v);const deduction=threshold?Math.floor(absent/threshold+1e-9):0;return {base,scheduledDays:days,threshold,absentDays:absent,deduction,grant:Math.max(0,base-deduction)}}
function annualRights(year,c,leaves={}){const grants={...RIGHTS,...(c.rights||{})[year],RPS:0};grants.RTT=rttCmo(year,c,leaves).grant;if(!c.cahpManual?.[year])grants.CAHP=cahpForYear(year,c,leaves).earned;return grants}
function rpsCurrent(asOf,c,leaves={}){
 const start=c.rpsStart||c.anchor,cutoff=asOf>start?asOf:start;
 const booked=rpsTaken(cutoff,add(MAX,1),c,leaves),balance=rpsBalance(asOf,c,leaves);
 const tomorrow=add(asOf,1),from=tomorrow>start?tomorrow:start,end=(Number(asOf.slice(0,4))+1)+'-01-01';
 return {balance,booked,available:balance-booked,upcoming:rpsBetween(from,end,c,leaves).days};
}
function rightsForYear(year,c,leaves,asOf){
 const grants=annualRights(year,c,leaves),account=rpsAccount(year,c,leaves);grants.RPS=account.opening+account.earned.days;
 const rows=Object.entries(grants).map(([type,grant])=>({type,grant,past:0,future:0,remaining:grant,over:0}));
 for(const [d,v] of Object.entries(leaves)){const row=rows.find(r=>r.type===leaveType(v));if(row&&Number(d.slice(0,4))===Number(year)&&shift(d,c).worked&&(row.type!=='RPS'||d>=(c.rpsStart||c.anchor))){if(d<asOf)row.past+=leaveAmount(v);else row.future+=leaveAmount(v)}}
 for(const row of rows){row.remaining=row.type==='RPS'?row.grant-row.past-row.future:Math.max(0,row.grant-row.past-row.future);row.over=Math.max(0,row.past+row.future-row.grant)}
 return {rows,total:rows.reduce((s,r)=>s+r.grant,0),remaining:rows.reduce((s,r)=>s+r.remaining,0),over:rows.reduce((s,r)=>s+r.over,0)};
}
function rpsBetween(from,to,c,leaves={}){
 const a=date(from).getTime(),b=date(to).getTime();
 let sundayMinutes=0,nightMinutes=0;
 if(b<=a)return {sundayMinutes,nightMinutes,earnedMinutes:0,days:0};
 for(let d=add(from,-1);d<to;d=add(d,1)){
  for(const [start,end] of workedIntervals(d,c,leaves[d])){
   for(let t=Math.max(start,a);t<Math.min(end,b);){
    const midnight=Math.floor(t/DAY)*DAY,next=Math.min(midnight+DAY,end,b);
    if(new Date(midnight).getUTCDay()===0)sundayMinutes+=(next-t)/60000;
    const overlap=(x,y)=>Math.max(0,Math.min(next,y)-Math.max(t,x))/60000;
    nightMinutes+=overlap(midnight,midnight+6*3600000)+overlap(midnight+21*3600000,midnight+DAY);
    t=next;
   }
  }
 }
 const earnedMinutes=sundayMinutes*0.4+nightMinutes*0.1;
 return {sundayMinutes,nightMinutes,earnedMinutes,days:earnedMinutes/728};
}

function rpsTaken(from,to,c,leaves){return Object.entries(leaves).reduce((n,[d,v])=>n+(d>=from&&d<to&&leaveType(v)==='RPS'&&shift(d,c).worked?leaveAmount(v):0),0)}
function rpsBalance(to,c,leaves={}){
 const start=c.rpsStart||c.anchor;
 if(to<start)return 0;
 return (c.rpsOpening||0)+rpsBetween(start,to,c,leaves).days-rpsTaken(start,to,c,leaves);
}
function rpsAccount(year,c,leaves={}){
 const first=year+'-01-01',end=(Number(year)+1)+'-01-01',start=c.rpsStart||c.anchor,from=first>start?first:start;
 if(end<=start)return {opening:0,earned:{days:0,earnedMinutes:0},taken:0,balance:0};
 const opening=first>start?rpsBalance(first,c,leaves):(c.rpsOpening||0),earned=rpsBetween(from,end,c,leaves),taken=rpsTaken(from,end,c,leaves);
 return {opening,earned,taken,balance:opening+earned.days-taken};
}

function rpsYear(year,c,leaves={},asOf){
 const from=year+'-01-01',to=(Number(year)+1)+'-01-01',cutoff=asOf<from?from:asOf>to?to:asOf;
 return {gross:rpsBetween(from,to,c,{}),net:rpsBetween(from,to,c,leaves),elapsed:rpsBetween(from,cutoff,c,leaves),months:months.map((name,i)=>{const a=key(new Date(Date.UTC(year,i,1))),b=key(new Date(Date.UTC(year,i+1,1)));return {name,...rpsBetween(a,b,c,leaves)}})};
}
function payrollBetween(from,to,c,leaves={}){
 let nightMinutes=0,sundayHolidayMinutes=0;
 // Payroll assigns the full service to its start date, including hours after midnight.
 // Sunday/holiday eligibility still follows the civil date of each actual hour.
 for(let d=from;d<to;d=add(d,1))for(const [start,end] of workedIntervals(d,c,leaves[d]))for(let t=start;t<end;){const midnight=Math.floor(t/DAY)*DAY,next=Math.min(midnight+DAY,end),weekday=new Date(midnight).getUTCDay(),holiday=!!holidayName(key(new Date(midnight))),overlap=(x,y)=>Math.max(0,Math.min(next,y)-Math.max(t,x))/60000;
  nightMinutes+=overlap(midnight,midnight+6*3600000)+overlap(midnight+21*3600000,midnight+DAY);
  if(weekday===0||holiday)sundayHolidayMinutes+=overlap(midnight+6*3600000,midnight+21*3600000);
  t=next;
 }
 const nightHourly=0.97,sundayHourly=0.76,periodMonths=(Number(to.slice(0,4))-Number(from.slice(0,4)))*12+Number(to.slice(5,7))-Number(from.slice(5,7)),nightFixedMonthly=128,nightFixedGross=periodMonths*nightFixedMonthly;
 return {nightMinutes,sundayHolidayMinutes,nightHourly,sundayHourly,nightHourlyGross:nightMinutes/60*nightHourly,sundayHolidayGross:sundayHolidayMinutes/60*sundayHourly,nightFixedMonthly,nightFixedGross,estimatedGross:nightMinutes/60*nightHourly+sundayHolidayMinutes/60*sundayHourly+nightFixedGross};
}
// Common estimate of bonuses after CSG/CRDS, before income tax; additional RAFP deductions are not inferred.
function estimatedPayrollNet(gross){return gross*(1-(9.7/100)*(98.25/100))}
function payrollYear(year,c,leaves={}){return [0,1,2,3].map(q=>{const startMonth=q*3,from=key(new Date(Date.UTC(year,startMonth,1))),to=key(new Date(Date.UTC(year,startMonth+3,1)));const r=payrollBetween(from,to,c,leaves);return {quarter:q+1,from,to,months:[months[startMonth],months[startMonth+1],months[startMonth+2]],...r}})}
function retirementSummary(asOf,c,leaves){
 if(!validDate(asOf)||!c.retirement||!inRange(c.retirement))return null;
 const from=asOf<MIN?MIN:asOf,end=c.retirement,days=from<end?range(from,add(end,-1)):[];
 return {...summary(days,c,leaves),calendarDays:days.length,from,end,years:[...new Set(days.map(d=>d.slice(0,4)))].map(y=>({year:Number(y),...summary(days.filter(d=>d.startsWith(y)),c,leaves)}))};
}
function validate(data){
 if(!data||data.version!==1||!data.settings||!data.leaves||Array.isArray(data.leaves)||typeof data.leaves!=='object')throw Error('Format de sauvegarde non reconnu.');
 const c=data.settings;if(!inRange(c.anchor)||!['Nuit','Jour'].includes(c.first))throw Error('Ancrage invalide : choisissez une date entre 2026 et 2050.');
 const rpsStart=c.rpsStart===undefined?c.anchor:c.rpsStart,rpsOpening=c.rpsOpening===undefined?0:c.rpsOpening;if(!inRange(rpsStart)||typeof rpsOpening!=='number'||!Number.isFinite(rpsOpening)||Math.abs(rpsOpening)>10000)throw Error('Solde ou date de départ RPS invalide.');
 const cahpManual={};if(c.cahpManual!==undefined){if(!c.cahpManual||typeof c.cahpManual!=='object'||Array.isArray(c.cahpManual))throw Error('Réglage CAHP invalide.');for(const [y,v] of Object.entries(c.cahpManual)){if(!/^20[0-9]{2}$/.test(y)||+y<2026||+y>2050||typeof v!=='boolean')throw Error('Réglage CAHP invalide.');cahpManual[y]=v}}
 const retirement=c.retirement===undefined?'':c.retirement;if(retirement!==''&&!inRange(retirement))throw Error('Date de retraite invalide : choisissez une date entre 2026 et 2050.');
 const changes=c.changes||[];if(!Array.isArray(changes)||changes.length>500)throw Error('Historique invalide.');
 const seen=new Set();for(const x of changes){if(!x||!inRange(x.from)||!inRange(x.anchor)||!['Nuit','Jour'].includes(x.first)||seen.has(x.from))throw Error('Changement de cycle invalide ou date en double.');seen.add(x.from)}
 for(const k of ['Jour','Nuit'])if(!c[k]||![c[k].start,c[k].end].every(t=>typeof t==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t))||duration(c[k])===0)throw Error('Horaires invalides.');
 // Migrate the old defaults, whose day/night labels were reversed, so saved calendars calculate pay from the right service.
 let Jour=c.Jour,Nuit=c.Nuit;
 if(Jour.start==='19:00'&&Jour.end==='07:08'&&Nuit.start==='07:00'&&Nuit.end==='19:08'){
  Jour={start:'07:00',end:'19:08'};Nuit={start:'19:00',end:'07:08'};
 }
 
 const rights={};if(c.rights!==undefined){if(!c.rights||typeof c.rights!=='object'||Array.isArray(c.rights))throw Error('Droits annuels invalides.');
 for(const [y,values] of Object.entries(c.rights)){if(!/^20[0-9]{2}$/.test(y)||+y<2026||+y>2050||!values||typeof values!=='object'||Array.isArray(values))throw Error('Année de droits invalide.');rights[y]={};for(const [type,n] of Object.entries(values)){if(!TYPES.includes(type)||typeof n!=='number'||!Number.isFinite(n)||n<0||n>1000)throw Error('Droits : nombre entre 0 et 1 000 requis.');rights[y][type]=Math.round(n*100)/100}}
 }
 const leaves={};for(const [d,t] of Object.entries(data.leaves)){if(!inRange(d)||!TYPES.includes(leaveType(t))||(typeof t!=='string'&&(!t||t.amount!==0.5||!['first','second'].includes(t.part))))throw Error('Congé invalide dans la sauvegarde.');leaves[d]=typeof t==='string'?t:{type:t.type,amount:0.5,part:t.part}}

 return {version:1,settings:{anchor:c.anchor,first:c.first,retirement,rights,cahpManual,rpsStart,rpsOpening,changes:changes.map(x=>({from:x.from,anchor:x.anchor,first:x.first})).sort((a,b)=>a.from.localeCompare(b.from)),Jour:{start:Jour.start,end:Jour.end},Nuit:{start:Nuit.start,end:Nuit.end}},leaves};
}
const months=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
// PDF autonome, 12 pages vectorielles A4 paysage. Cette fonction ne reçoit jamais les congés.
function annualPDF(year,c=DEFAULT){return generalPDF(year,12,false,c,1)}
function generalPDF(year,count,includeLeaves,c=DEFAULT,startMonth=1,leaves={}){
 if(!Number.isInteger(year)||year<2026||year>2050||![6,12].includes(count)||!Number.isInteger(startMonth)||startMonth<1||startMonth>12)throw Error('Choisissez 6 ou 12 mois entre 2026 et 2050.');
 const ascii=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/–/g,'-').replace(/[^\x20-\x7e]/g,'');
 const esc=s=>ascii(s).replace(/([\\()])/g,'\\$1');
 const objects=[null,'<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];
 const kids=[];
 for(let idx=0;idx<count;idx++){
  const month=(startMonth-1+idx)%12,actualYear=year+Math.floor((startMonth-1+idx)/12);
  let content='';
  const text=(x,y,size,s,bold=false,color='0.07 0.16 0.29')=>{content+=`${color} rg BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${esc(s)}) Tj ET\n`};
  const rect=(x,y,w,h,color)=>{content+=`${color} rg ${x} ${y} ${w} ${h} re f\n`};
  rect(0,555,842,40,'0.07 0.16 0.29');text(32,569,15,'PLANNING BINAIRE',true,'1 1 1');text(32,523,25,months[month]+' '+actualYear,true);
  text(32,502,10,'Cycle theorique '+(includeLeaves?'AVEC CONGES':'SANS CONGES')+' - Date de debut du service');
  const first=new Date(Date.UTC(actualYear,month,1)), monthDays=new Date(Date.UTC(actualYear,month+1,0)).getUTCDate(), offset=(first.getUTCDay()+6)%7;
  const labels=['LUNDI','MARDI','MERCREDI','JEUDI','VENDREDI','SAMEDI','DIMANCHE'];
  for(let j=0;j<7;j++)text(40+j*111,475,10,labels[j],true);
  for(let i=0;i<42;i++){
   const n=i-offset+1,x=32+(i%7)*111,y=399-Math.floor(i/7)*60;
   if(n<1||n>monthDays){rect(x,y,107,56,'0.97 0.98 0.99');continue}
   const d=key(new Date(Date.UTC(actualYear,month,n))),s=shift(d,c),leave=includeLeaves?leaves[d]:null,night=s.type==='Nuit',holiday=holidayName(d);
   rect(x,y,107,56,leave?'0.98 0.78 0.81':night?'0.07 0.16 0.29':s.worked?'0.82 0.89 0.98':'0.95 0.96 0.98');
   const ink=night&&!leave?'1 1 1':'0.07 0.16 0.29';text(x+8,y+39,12,n,true,ink);text(x+8,y+23,11,leave?leaveLabel(leave):s.type,true,ink);if(s.worked)text(x+8,y+8,9,s.time,false,ink);if(holiday)text(x+72,y+39,7,'JF',true,'0.75 0.08 0.16');
  }
  const a=key(first),b=key(new Date(Date.UTC(actualYear,month+1,0))),st=summary(range(a,b),c,includeLeaves?leaves:{});
  text(32,74,11,st.services+' services / '+Math.floor(st.minutes/60)+' h '+String(st.minutes%60).padStart(2,'0')+' theoriques',true);
  text(32,54,9,'Jour : '+c.Jour.start+' - '+c.Jour.end+' | Nuit : '+c.Nuit.start+' - '+c.Nuit.end+' | Horaires personnalises');
  text(32,34,9,'Cycle 28 jours - Changements dates pris en compte - '+(includeLeaves?'Conges inclus':'Aucun conge inclus'));text(755,34,9,(idx+1)+' / '+count);
  const pageID=objects.length,streamID=pageID+1;kids.push(pageID+' 0 R');
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamID} 0 R >>`);
  objects.push(`<< /Length ${content.length} >>\nstream\n${content}endstream`);
 }
 objects[2]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${count} >>`;
 let out='%PDF-1.4\n',offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=out.length;out+=`${i} 0 obj\n${objects[i]}\nendobj\n`}
 const start=out.length;out+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)out+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 out+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return out;
}
// Calendrier mural : 12 colonnes, 31 lignes, un seul feuillet A3 paysage.
function classicPDF(year,c=DEFAULT,leaves={}){
 if(!Number.isInteger(year)||year<2026||year>2050)throw Error('Année du calendrier : 2026 à 2050.');
 const esc=s=>String(s).replace(/–/g,'-').replace(/œ/g,'oe').replace(/[^\x20-\xff]/g,' ').replace(/([\\()])/g,'\\$1').replace(/[\x80-\xff]/g,ch=>'\\'+ch.charCodeAt(0).toString(8).padStart(3,'0'));
 let stream='';const text=(x,y,size,s,white=false,bold=false)=>{stream+=`${white?'1 1 1':'0.07 0.16 0.29'} rg BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${esc(s)}) Tj ET\n`};const rect=(x,y,w,h,color)=>{stream+=`${color} rg ${x} ${y} ${w} ${h} re f\n`};
 rect(0,778,1191,64,'0.07 0.16 0.29');text(28,805,24,'PLANNING BINAIRE',true,true);text(920,805,24,year,true,true);text(28,754,12,'Calendrier annuel avec les congés enregistrés - Date du début de chaque service');
 const widths=94.5,left=28,top=710,rowHeight=19.1,week=['Di','Lu','Ma','Me','Je','Ve','Sa'];
 for(let m=0;m<12;m++){
  const x=left+m*widths;rect(x,top+4,widths-2,25,'0.87 0.92 0.98');text(x+5,top+12,10,months[m],false,true);
  for(let n=1;n<=31;n++){const y=top-n*rowHeight,s=year+'-'+String(m+1).padStart(2,'0')+'-'+String(n).padStart(2,'0');if(!validDate(s)){rect(x,y,widths-2,rowHeight-1,'0.96 0.97 0.98');continue}const sh=shift(s,c),leave=leaves[s],night=!leave&&sh.type==='Nuit',weekday=date(s).getUTCDay();rect(x,y,widths-2,rowHeight-1,leave?'0.98 0.78 0.81':night?'0.07 0.16 0.29':sh.worked?'0.82 0.89 0.98':weekday===0||weekday===6?'0.88 0.90 0.94':'0.96 0.97 0.98');text(x+4,y+5,8.5,String(n).padStart(2,'0')+' '+week[weekday],night);text(x+47,y+5,8.5,leaveLabel(leave)||(sh.type==='Repos'?'R':sh.type==='Jour'?'J':'N'),night,true)}
 }
 text(28,88,10,'J = Jour '+c.Jour.start+'-'+c.Jour.end+'   N = Nuit '+c.Nuit.start+'-'+c.Nuit.end+'   R = Repos   Rouge = congé (CA, CAHP, RTT, RPS, CF, CET, HS)');
 const st=summary(range(year+'-01-01',year+'-12-31'),c,leaves);text(28,65,10,st.services+' services au cycle | '+(st.services-st.absences)+' après congés | '+Object.values(st.counts).reduce((s,n)=>s+n,0)+' jours équivalents de congé enregistrés');text(28,42,9,'Changements de cycle datés inclus. Format A3 paysage ; impression possible en A4 avec ajustement à la page.');
 const objects=[null,'<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [5 0 R] /Count 1 >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1191 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>',`<< /Length ${stream.length} >>\nstream\n${stream}endstream`];
 let out='%PDF-1.4\n',offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=out.length;out+=`${i} 0 obj\n${objects[i]}\nendobj\n`}const start=out.length;out+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)out+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';return out+`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
}
 const api={parseRpsHours,cahpForYear,rpsCurrent,rpsBalance,rpsAccount,leaveType,leaveAmount,leaveLabel,workedIntervals,annualRights,rttCmo,rpsBetween,rpsYear,payrollBetween,estimatedPayrollNet,payrollYear,frenchHolidayNames,holidayName,easterSunday,DAY,MIN,MAX,TYPES,RIGHTS,DEFAULT,date,key,add,validDate,inRange,duration,shift,range,summary,weekendFree,rightsForYear,retirementSummary,validate,months,annualPDF,generalPDF,classicPDF};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Planning=api;
})(globalThis);
