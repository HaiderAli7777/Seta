function Dashboard({state,books,go,newDoc,range,setRange,user,setup,whole,canAdd}){
 const [tab,setTabS]=useState(readDashTab),[gran,setGran]=useState('month'),[tx,setTx]=useState('all'),[settlement,setSettlement]=useState('collect');
 const C=useC(),company=useCo(),from=range.from,to=range.to;
 const setTab=(t)=>{setTabS(t);try{localStorage.setItem(DASH_TAB_KEY,t);}catch(e){}};
 const rootRef=React.useRef(null),spot=useDashMotion(rootRef,[tab]);
 const P=useMemo(()=>pnl(books.flat,from,to),[books,from,to]);
 const cr=cmpRange(range,'prev'),pastEnd=cr.to,pastStart=cr.from;
 const prior=useMemo(()=>pnl(books.flat,pastStart,pastEnd),[books,pastStart,pastEnd]);
 /* Stock is held for the whole company, so its value comes from every branch's buying and selling. */
 const W=whole||state;
 const periodBooks=useMemo(()=>deriveBooks({...W,docs:W.docs.filter(d=>d.date<=to),payments:W.payments.filter(d=>d.date<=to),manual:W.manual.filter(d=>d.date<=to),stockOps:W.stockOps.filter(d=>d.date<=to)}),[W,to]);
 const ar=useMemo(()=>aging(state,'receivable',to),[state,to]),ap=useMemo(()=>aging(state,'payable',to),[state,to]);
 const buckets=useMemo(()=>bucketize(from,to,gran),[from,to,gran]);
 const bankCodes=ACCOUNTS.filter(a=>a.type==='bank').map(a=>a.code);
 const cashAt=date=>R2(books.flat.filter(l=>bankCodes.includes(l.acc)&&l.date<=date).reduce((s,l)=>s+l.debit-l.credit,0));
 const series=buckets.rows.map(b=>{const p=pnl(books.flat,b.from,b.to);return {label:b.label,full:b.full,revenue:p.revenue,cost:p.cost+p.expense,gross:p.gross,profit:p.net,cash:cashAt(b.to)};});
 const cash=cashAt(to),inventory=Object.values(periodBooks.stock).reduce((s,x)=>s+x.value,0);
 const dueBook=settlement==='collect'?ar:ap;
 const openItems=dueBook.rows.flatMap(r=>r.items.map(i=>({...i,partner:r.partner,days:daysBetween(i.due,to)}))).sort((a,b)=>b.days-a.days||b.open-a.open);
 const openTotal=R2(openItems.reduce((sum,i)=>sum+i.open,0)),overdueTotal=R2(openItems.filter(i=>i.days>0).reduce((sum,i)=>sum+i.open,0));
 const unapplied=R2(dueBook.rows.reduce((sum,r)=>sum+r.unapplied,0)),drafts=state.docs.filter(x=>x.state==='draft');
 const movement=cashMovement(books.entries,bankCodes,from,to);
 const flowSeries=bucketize(from,to,rangeDays(range)>90?'month':rangeDays(range)>31?'week':'day').rows.map(b=>({...b,...cashMovement(books.entries,bankCodes,b.from,b.to)}));
 const flowMax=Math.max(1,...flowSeries.flatMap(b=>[b.incoming,b.outgoing]));
 const low=PRODUCTS.filter(p=>p.kind==='goods'&&(books.stock[p.id]?.qty||0)<=(p.reorder??5));

 const recent=state.docs.filter(d=>inRange(d.date,from,to)&&(tx==='all'||DOCMETA[d.type].side===tx)).slice().sort((a,b)=>b.date.localeCompare(a.date)||b.number.localeCompare(a.number)).slice(0,10);
 const firstDate=books.flat.reduce((m,l)=>l.date<m?l.date:m,'9999-12-31');
 const openNow={};[aging(state,'receivable',TODAY),aging(state,'payable',TODAY)].forEach(a=>a.rows.forEach(r=>r.items.forEach(i=>{openNow[i.id]=i.open;})));
 const delta=(v,p)=>p&&pastStart>=firstDate?((v-p)/Math.abs(p)*100):null;
 const label={mtd:'this month so far',qtd:'this quarter so far',ytd:'this year so far',d365:'over the last 12 months',today:'today',yesterday:'yesterday',d7:'over the last 7 days',d30:'over the last 30 days',lastm:'last month',lastq:'last quarter',fy:'this financial year'}[range.preset]||('from '+dmy(from)+' to '+dmy(to));
 const movers=useMemo(()=>stockMovement(state,books,periodBooks.stock,from,to),[state,books,periodBooks,from,to]);
 const invoicesIssued=state.docs.filter(d=>d.type==='invoice'&&d.state==='posted'&&inRange(d.date,from,to)).length;
 const arLate=R2(ar.rows.reduce((s,r)=>s+r.total-r.b[0],0)),lowCount=low.length,goodsCount=PRODUCTS.filter(p=>p.kind==='goods').length;
 const bar=(pct,tone)=><div className={'kt-meter '+(tone||'')}><i style={{width:Math.max(0,Math.min(100,pct))+'%'}}/></div>;

 const ap0=R2(ap.rows.reduce((s,r)=>s+r.total-r.b[0],0)),lateCount=ar.rows.reduce((n,r)=>n+r.items.filter(i=>i.due<to).length,0);
 const netBars=useMemo(()=>{const g=rangeDays(range)>90?'month':rangeDays(range)>31?'week':'day';return bucketize(from,to,g).rows.slice(-16).map(b=>({l:b.full||b.label,v:pnl(books.flat,b.from,b.to).net}));},[books,from,to]);
 const qs=quarterStart(),vat=useMemo(()=>vat201(state,qs,TODAY),[state,qs]);
 const tabCount={money:lateCount?[lateCount,'warn','overdue invoices']:null,items:lowCount?[lowCount,'warn','items low on stock']:null,activity:drafts.length?[drafts.length,'','drafts to post']:null};
 const tools={
  perf:<><div className="seg" aria-label="Group by">{[['day','Day'],['week','Week'],['month','Month']].map(([v,l])=><button key={v} className={gran===v?'on':''} onClick={()=>setGran(v)}>{l}</button>)}</div><Btn size="sm" onClick={()=>go('r_pnl')}>Profit & loss <ArrowUpRight size={13}/></Btn></>,
  money:<><Btn size="sm" onClick={()=>go('r_aged_ar')}>Aged receivable <ArrowUpRight size={13}/></Btn><Btn size="sm" onClick={()=>go('banking')}>Bank & cash <ArrowUpRight size={13}/></Btn></>,
  items:<><Btn size="sm" className="cost-data" onClick={()=>go('r_stock')}>Stock valuation <ArrowUpRight size={13}/></Btn><Btn size="sm" onClick={()=>go('r_cust')} className="cost-data">Profit by customer <ArrowUpRight size={13}/></Btn></>,
  activity:<div className="seg" aria-label="Show">{[['all','All'],['sale','Sales'],['purchase','Purchases']].map(([v,l])=><button key={v} className={tx===v?'on':''} onClick={()=>setTx(v)}>{l}</button>)}</div>,
  detail:<Btn size="sm" onClick={()=>go('reports')}>All reports <ArrowUpRight size={13}/></Btn>};
 return <div className="studio-dashboard dash2 dash-doc" ref={rootRef} onMouseMove={spot}>
 <ApprovalInbox state={state} user={user} go={go}/>
 {setup}
 <PdcReminder state={state} go={go}/>
 <div className="ds-sheet">
 <DashDocHead user={user} company={company} range={range} setRange={setRange} P={P} prior={prior} comparable={pastStart>=firstDate} bars={netBars} drafts={drafts.length} low={lowCount} balanced={books.balanced} go={go} newDoc={newDoc} canAdd={canAdd}/>
 <div className="ds-fields" aria-label="Key figures">
  <DashField label="Sales" icon={TrendingUp} value={P.revenue} delta={delta(P.revenue,prior.revenue)} sub="after returns" spark={series.map(x=>x.revenue)} onClick={()=>go('r_pnl')}/>
  <DashField label="Costs & expenses" icon={Wallet} value={P.cost+P.expense} goodUp={false} delta={delta(P.cost+P.expense,prior.cost+prior.expense)} sub="goods sold + running costs" spark={series.map(x=>x.cost)} color="var(--s2)" onClick={()=>go('r_pnl')}/>
  <DashField label="Gross profit" icon={Layers} cls="cost-data" value={P.gross} delta={delta(P.gross,prior.gross)} sub={P.gm.toFixed(1)+'% margin'} spark={series.map(x=>x.gross)} color="var(--s3)" onClick={()=>go('r_prod')}/>
  <DashField label="Cash & bank" icon={Landmark} value={cash} sub={`in ${short(movement.incoming)} · out ${short(movement.outgoing)}`} spark={series.map(x=>x.cash)} color="var(--pos)" onClick={()=>go('banking')}/>
  <DashField label="To collect" icon={ArrowDownLeft} tone={arLate>0.004?'neg':''} value={ar.grand} sub={arLate>0.004?'AED '+money(arLate,false)+' overdue':'nothing overdue'} meter={ar.grand>0?arLate/ar.grand*100:0} meterTone="neg" onClick={()=>go('r_aged_ar')}/>
  <DashField label="To pay" icon={ArrowUpRight} tone={ap0>0.004?'warn':''} value={ap.grand} sub={ap0>0.004?'AED '+money(ap0,false)+' past due':'nothing past due'} meter={ap.grand>0?ap0/ap.grand*100:0} meterTone="warn" onClick={()=>go('r_aged_ap')}/>
  <DashField label="Stock value" icon={Package} cls="cost-data" tone={lowCount?'warn':''} value={inventory} sub={(W!==state?'whole company · ':'')+(lowCount?lowCount+' item'+(lowCount===1?'':'s')+' low on stock':'stock levels healthy')} meter={goodsCount?(goodsCount-lowCount)/goodsCount*100:0} meterTone="pos" onClick={()=>go('r_stock')}/>
  <DashField label={vat.due>=0?'VAT due this quarter':'VAT refund this quarter'} icon={ShieldCheck} value={Math.abs(vat.due)} sub={`Q${Math.floor((+qs.slice(5,7)-1)/3)+1} · file by ${dmy(addDays(addDays(addMonths(qs,3),-1),28))}`} onClick={()=>go('r_vat')}/>
 </div>
 <div className="document-toolbar ds-toolbar"><div className="doc-tabs" role="tablist" aria-label="Dashboard views">{DASH_TABS.map(([k,l,I])=><button role="tab" key={k} data-tab={k} aria-selected={tab===k} className={tab===k?'on':''} onClick={()=>setTab(k)}><I size={15}/>{l}{tabCount[k]&&<span className={tabCount[k][1]} title={tabCount[k][0]+' '+tabCount[k][2]}>{tabCount[k][0]}</span>}</button>)}</div><div className="acts">{tools[tab]}</div></div>
 {tab==='perf'&&<div className="ds-pane" key="perf">
 <div className="dash-row r21"><Card className="revenue-card" title="Revenue & costs" sub={`${dmy(from)} — ${dmy(to)} · AED`}><div className="viz-legend"><span><i style={{background:'var(--s1)'}}/>Revenue</span><span><i style={{background:'var(--s2)'}}/>Costs & expenses</span><span><i className="ln" style={{background:'var(--s3)'}}/>Net profit</span></div>{series.some(x=>Math.abs(x.revenue)>0.004||Math.abs(x.cost)>0.004)?<><ColumnChart key={gran+from+to} data={series} height={236} series={[{key:'revenue',name:'Revenue',color:'var(--s1)'},{key:'cost',name:'Costs & expenses',color:'var(--s2)'}]} line={{key:'profit',name:'Net profit',color:'var(--s3)'}} ariaLabel="Revenue, costs and net profit"/></>:<div className="chart-empty" style={{height:244}}><EmptyState icon={BarChart3} title="No sales or costs in this period">Post an invoice or a bill and your trend appears here.</EmptyState><Btn kind="pri" icon={Plus} onClick={()=>newDoc('invoice')}>Create an invoice</Btn></div>}<div className="chart-bottom"><span>Gross profit <b>AED {money(P.gross,false)}</b></span><span>Gross margin <b>{P.gm.toFixed(1)}%</b></span><button onClick={()=>go('r_pnl')}>Explore report <ArrowUpRight size={14}/></button></div></Card>
 <DashHealth books={books} P={P} ar={ar} cash={cash} from={from} to={to} go={go}/></div>
 <div className="dash-row r21"><DashLines series={series} P={P} gran={gran} go={go}/><DashCategories state={state} from={from} to={to} go={go}/></div>
 </div>}
 {tab==='money'&&<div className="ds-pane" key="money">
 <div className="dash-row r111"><Card className="receivables-card dash-recv" title={settlement==='collect'?'Money to collect':'Money to pay'} sub={`Open ${settlement==='collect'?'invoices':'bills'} as at ${dmy(to)}`} right={<div className="seg settlement-switch" aria-label="Settlement view"><button className={settlement==='collect'?'on':''} onClick={()=>setSettlement('collect')}>Collect</button><button className={settlement==='pay'?'on':''} onClick={()=>setSettlement('pay')}>Pay</button></div>}><div className="collection-total"><small>AED</small><b>{money(openTotal,false)}</b><span>{openItems.length} open</span></div><div className="collection-bar"><i style={{width:(openTotal?overdueTotal/openTotal*100:0)+'%'}}/></div><div className="collection-label"><span><i/>Overdue <b>{money(overdueTotal,false)}</b></span><span>Not due <b>{money(openTotal-overdueTotal,false)}</b></span></div><div className="collection-list">{openItems.slice(0,5).map((i,ci)=><button key={i.id} style={{'--i':ci}} onClick={()=>go(settlement==='collect'?'invoices':'bills',i.id)}><Avatar name={i.partner.name} size={32}/><span><b>{i.partner.name}</b><small>{i.days>0?i.days+' days overdue':i.days===0?'Due today':'Due in '+(-i.days)+' days'} · {i.number}</small></span><strong>{money(i.open,false)}</strong></button>)}{!openItems.length&&<div className="collection-clear"><CircleCheck size={26}/><b>All caught up</b><span>No open {settlement==='collect'?'invoices':'bills'} on this date.</span></div>}</div>{unapplied>0&&<p className="collection-credit">Unapplied credits: AED {money(unapplied,false)} · Net balance {money(dueBook.grand,false)}</p>}<Btn onClick={()=>go(settlement==='collect'?'r_aged_ar':'r_aged_ap')}>Manage {settlement==='collect'?'receivables':'payables'} <ArrowRight size={14}/></Btn></Card><DashAgenda state={state} go={go}/><Card title="Cash movement" sub="Posted cash and bank activity in the selected period" right={<button className="icon-btn" title="Open banking" onClick={()=>go('banking')}><ArrowUpRight size={18}/></button>}><div className="flow-totals"><div><span><i className="flow-in"/>Money in</span><b>{money(movement.incoming,false)}</b></div><div><span><i className="flow-out"/>Money out</span><b>{money(movement.outgoing,false)}</b></div><div><span>Net movement · AED</span><b className={movement.net<0?'neg':'pos'}>{movement.net>0?'+':''}{money(movement.net,false)}</b></div></div>{movement.incoming+movement.outgoing<0.005?<div className="chart-empty flow-empty"><EmptyState icon={Banknote} title="No money in or out yet">Receipts, payments and expenses will show here as green and red bars.</EmptyState></div>:null}<div className="flow-chart" hidden={movement.incoming+movement.outgoing<0.005} role="img" aria-label={`Cash movement: incoming AED ${movement.incoming}, outgoing AED ${movement.outgoing}.`} style={{gridTemplateColumns:`repeat(${flowSeries.length},minmax(8px,1fr))`}}>{flowSeries.map((b,i)=><div className="flow-period" key={i} style={{'--d':i}} title={`${b.full}: in ${money(b.incoming,false)}, out ${money(b.outgoing,false)}`}><div><i className="flow-in" style={{height:(b.incoming/flowMax*100)+'%'}}/><i className="flow-out" style={{height:(b.outgoing/flowMax*100)+'%'}}/></div><span>{i%Math.max(1,Math.ceil(flowSeries.length/9))===0?b.label:''}</span></div>)}</div><div className="flow-note"><span>Includes all posted cash movements.</span><span>Transfers between cash / bank accounts excluded.</span></div></Card></div>
 </div>}
 {tab==='items'&&<div className="ds-pane" key="items">
 <div className="dash-row r111"><FastMovers rows={movers} go={go} from={from} to={to}/><SlowMovers rows={movers} go={go} to={to}/><TopCustomers state={state} ar={ar} from={from} to={to} go={go}/></div>
 </div>}
 {tab==='activity'&&<div className="ds-pane" key="activity">
 <div className="dash-row r1"><Card title="Recent transactions" sub="Latest activity in the selected period" pad={false} right={<div className="seg">{[['all','All'],['sale','Sales'],['purchase','Purchases']].map(([v,l])=><button key={v} className={tx===v?'on':''} onClick={()=>setTx(v)}>{l}</button>)}</div>}><div className="tbl-wrap"><table className="tbl recent-table"><thead><tr><th>Document / partner</th><th>Date</th><th className="n">Total · AED</th><th>Status</th><th/></tr></thead><tbody>{recent.map((d,ri)=><tr key={d.id} style={{'--i':ri}}><td><button className="transaction-name" onClick={()=>go(LIST_OF[d.type],d.id)}><span className={cx('transaction-icon',DOCMETA[d.type].side==='sale'?'mint':'blue')}><FileText size={17}/></span><span><b>{d.number}</b><small>{PMAP[d.partner]?.name}</small></span></button></td><td>{dmy(d.date)}</td><td className="n"><b>{money(amounts(d).total,false)}</b></td><td>{(()=>{const st=d.type==='quote'?(QUOTE_STATES[d.state]||QUOTE_STATES.draft):docStatus(d,openNow[d.id]||0,d.type);return <span className="status-pill"><Pill tone={st.tone} dot>{st.label}</Pill></span>;})()}</td><td><button className="icon-btn" title={'Open '+d.number} onClick={()=>go(LIST_OF[d.type],d.id)}><ArrowUpRight size={15}/></button></td></tr>)}{!recent.length&&<tr><td colSpan="5"><EmptyState title={state.docs.length?"No transactions in this period":"No transactions yet"}>{state.docs.length?"Choose a wider date range.":"Invoices and bills you create will be listed here."}</EmptyState></td></tr>}</tbody></table></div></Card></div>
 </div>}
 {tab==='detail'&&<div className="ds-pane detail" key="detail"><LegacyDashboard state={state} books={books} go={go} newDoc={newDoc} range={range} setRange={setRange} user={user}/></div>}
 <div className="ds-foot">
  <div className="ds-note"><span className="ds-note-l">Summary</span>
   <PlainSummary state={state} books={books} from={from} to={to} label={label}/>
   <p className="ds-meta"><span><Scale size={13}/>Every figure comes straight from your books · {books.balanced?'ledger balanced':'ledger needs review'}.</span><span><Calendar size={13}/>Compared with {dmy(pastStart)} – {dmy(pastEnd)} · currency AED</span></p></div>
  <DashTotals P={P} invoices={invoicesIssued} go={go}/>
 </div>
 <div className="ds-dock">
  <span className="ds-dk-l"><i className={books.balanced?'':'warn'}/>Live from your books · {periodTitle(range)} · {dmy(from)} – {dmy(to)}</span>
  <span className="ds-dk-r"><span className="ds-dk-t"><small>{P.net<0?'Net loss':'Net profit'} · AED</small><b className={P.net<0?'neg':''}>{money(P.net,false)}</b></span><Btn onClick={()=>go('r_pnl')}>Profit & loss</Btn></span>
 </div>
 </div>
 </div>;
}
