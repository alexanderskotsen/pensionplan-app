/* Калькулятор пенсії на сайті. Формула нижче — КОПІЯ з pension.html (Mini App) і calc.py бота: міняєш одну, міняй інші. */
(function(){
// ===== Формула (копія з pension.html) =====
const ZP=17482.87, AVG_NOW=26269, PM=2595, MIN65=3758, MAX=25950, BASE_YEAR=2026, MIN_WAGE=8647;
const NET_TO_GROSS=1/(1-0.18-0.05), CHILD_RETURN=0.07, RET=0.03, YEARS=20;
const PAST=[8000,15000,25000,37500,55000,80000,null];
const jround=x=>Math.floor(x+0.5);
const money=n=>jround(n).toLocaleString('uk-UA').replace(/ /g,' ')+' грн';
const mln=n=>n>=1e6?(Math.round(n/1e5)/10).toString().replace('.',',')+' млн грн':money(n);
function req(y){const k=Math.min(Math.max(y-2026,0),2);return {r60:33+k,r63:23+k,r65:15}}
function statePension(sex,age,sa,total,kz){
  const year=BASE_YEAR+Math.max(0,jround(sa-age)), full=sex==='f'?30:35;
  const ks=Math.floor(total*12)/1200, raw=ZP*kz*ks;
  const over=Math.max(0,Math.floor(total-full)), extra=over*Math.min(raw*0.01,PM*0.01);
  const minP=total>=full?(sa>=65?MIN65:PM):PM*total/full;
  const p=Math.min(MAX,Math.max(raw+extra,minP)), rq=req(year);
  const need=sa>=65?rq.r65:sa>=63?rq.r63:rq.r60;
  return {p,ok:total>=need,need,rq,year};
}
const annuity=(m,n,r)=>(n<=0||m<=0)?0:(r>0?m*12*(1-Math.pow(1+r,-n))/r:m*12*n);
function calculate(sex,age,ret,stazh,future,pastK,salary,want){
  const total=stazh+future, futK=salary/AVG_NOW;
  const kz=total>0?(stazh*pastK+future*futK)/total:0, early=ret<60;
  let p,eligible,need,altAge=null,stateAge=null,bridge=0,gap,cap,year;
  if(!early){
    const s=statePension(sex,age,ret,total,kz); p=s.p;eligible=s.ok;need=s.need;year=s.year;
    if(!eligible){p=0;altAge=total>=s.rq.r63?63:total>=s.rq.r65?65:null}
    stateAge=eligible?ret:null; gap=Math.max(0,want-p); cap=annuity(gap,YEARS,RET);
  }else{
    p=0;eligible=false;need=null;
    for(const sa of [60,63,65]){const s=statePension(sex,age,sa,total,kz);if(need===null)need=s.need;if(s.ok){stateAge=sa;p=s.p;eligible=true;need=s.need;break}}
    year=BASE_YEAR+Math.max(0,jround(ret-age)); gap=Math.max(0,want-p);
    if(stateAge){bridge=stateAge-ret;cap=annuity(want,bridge,RET)+annuity(gap,YEARS,RET)/Math.pow(1+RET,bridge)}
    else{bridge=60-ret+YEARS;cap=annuity(want,bridge,RET)}
  }
  const months=Math.max(1,jround((ret-age)*12)), rm=Math.pow(1+RET,1/12)-1;
  const pmt=ret>age?cap*rm/(Math.pow(1+rm,months)-1):null;
  return {pension:jround(p),eligible,need,total,altAge,year,early,stateAge,bridge,gap:jround(gap),capital:jround(cap),pmt:pmt===null?null:jround(pmt),ratio:salary>0?jround(p/salary*100):null};
}
function pastFromNet(n){return n<10000?0:n<20000?1:n<30000?2:n<45000?3:n<65000?4:5}
const num=n=>jround(n).toLocaleString('uk-UA').replace(/\s/g,' ');
const yw=n=>{const a=n%10,b=n%100;return a===1&&b!==11?'рік':a>=2&&a<=4&&(b<10||b>=20)?'роки':'років'};
const $=id=>document.getElementById(id);
const BOT='https://t.me/tviy_finplan_bot?start=';
const PAGE=document.body.dataset.page||'home';
window.botLink=place=>BOT+'web_'+PAGE+'_'+place;
document.querySelectorAll('a[data-bot]').forEach(a=>{a.href=botLink(a.dataset.bot)});
const form=$('calc');if(!form)return;
const S={sex:'f',work:'emp',ret:60};
form.querySelectorAll('.chips').forEach(g=>g.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  g.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));S[g.dataset.k]=g.dataset.k==='ret'?+b.dataset.v:b.dataset.v;
  if(g.dataset.k==='work')$('netrow').hidden=S.work!=='emp';
  if(!$('res').hidden)calc(false)}));
const val=(id,lo,hi,def)=>{const x=parseFloat(String($(id).value).replace(',','.'));return isFinite(x)?Math.min(hi,Math.max(lo,x)):def};
function calc(scroll){
  const age=Math.round(val('age',18,64,35)), ret=Math.max(S.ret,age+1);
  const stazh=Math.min(val('stazh',0,50,10),Math.max(0,age-16));
  const net=val('net',0,500000,20000), want=val('want',1000,200000,15000);
  const salary=S.work==='emp'?net*NET_TO_GROSS:S.work==='fop'?MIN_WAGE:0;
  const future=S.work==='none'?0:Math.max(0,ret-age);
  const pastNet=PAST[S.work==='emp'?pastFromNet(net):2], pastK=pastNet===null?0.8:pastNet*NET_TO_GROSS/AVG_NOW;
  const r=calculate(S.sex,age,ret,stazh,future,pastK,salary,want);
  const alt=!r.eligible&&r.altAge?calculate(S.sex,age,r.altAge,stazh,future,pastK,salary,want):null;
  const shown=alt?alt.pension:r.pension, gap=Math.max(0,want-shown);
  let h='<div class="hero">';
  if(r.eligible){
    h+=`<p class="k">Пенсія від держави у ${ret} років</p><p class="v">≈ ${num(shown)}<small>грн/міс</small></p>`;
    h+=`<p class="s">${r.ratio&&S.work==='emp'?`Це близько ${r.ratio}% вашої зарплати. `:''}${gap>0?`До бажаних ${num(want)} грн не вистачатиме <b class="am">${num(gap)} грн</b> щомісяця.`:'Державна пенсія <b class="gd">покриває бажаний дохід</b>.'}</p>`;
  }else if(alt){
    h+=`<p class="k">Пенсія від держави з ${r.altAge} років</p><p class="v">≈ ${num(shown)}<small>грн/міс</small></p>`;
    h+=`<p class="s"><b class="am">У ${ret} права на пенсію ще не буде:</b> потрібно ${r.need} р. стажу, буде ${r.total}. Тому пенсію призначать з ${r.altAge}.${gap>0?` До бажаних ${num(want)} грн не вистачатиме <b class="am">${num(gap)} грн</b>.`:''}</p>`;
  }else{
    h+=`<p class="k">Пенсія від держави</p><p class="v">0<small>грн/міс</small></p><p class="s"><b class="am">Стажу (${r.total} р.) не вистачає на пенсію за віком</b>: навіть у 65 потрібно від 15 років.</p>`;
  }
  if(gap>0&&shown>0){const sh=Math.min(100,Math.round(shown/want*100));h+=`<div class="bar"><i style="width:${sh}%"></i></div><div class="barl"><span>держава ${num(shown)}</span><span>не вистачає ${num(gap)}</span></div>`}
  h+='</div>';
  const left=ret-age, pmt=alt?null:r.pmt;
  if(gap>0&&r.eligible&&pmt&&pmt<=20000&&!(S.work==='emp'&&pmt>net*0.5))
    h+=`<div class="card save"><p class="lbl">Щоб мати ${num(want)} грн/міс, відкладайте</p><p class="big">≈ ${num(pmt)} <small>грн на місяць</small></p><p class="hint">До пенсії ${left} ${yw(left)}, потрібен капітал ≈ ${num(r.capital)} грн.</p></div>`;
  if(S.work==='fop')h+=`<p class="note">ФОП з мінімальним ЄСВ отримає пенсію, близьку до мінімальної, навіть з великим доходом. <a href="/pensiya-fop/">Чому так і що з цим робити</a></p>`;
  if(S.work==='none')h+=`<p class="note">Неофіційна робота не додає ні стажу, ні пенсії.</p>`;
  h+=`<div class="cta-box"><a class="btn cta" href="${botLink('res')}">Отримати повний план у Telegram</a><p class="hint" style="text-align:center;margin:0">Безкоштовно: скільки відкладати, з якого віку і що це дасть</p></div>`;
  h+=`<p class="fine">Розрахунок орієнтовний: формула ПФУ в цінах 2026 року, не рішення Пенсійного фонду. Інвестиційний дохід не гарантований.</p>`;
  $('res').innerHTML=h;$('res').hidden=false;
  if(scroll)$('res').scrollIntoView({behavior:'smooth',block:'start'});
}
form.addEventListener('submit',e=>{e.preventDefault();calc(true)});
})();
