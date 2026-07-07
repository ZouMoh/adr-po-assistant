const KEYS=["adr_po_assistant_v8","adr_po_assistant_v7","adr_po_assistant_v6","adr_po_assistant_v5","adr_po_assistant_v4","adr_po_assistant_v3","adr_po_assistant_v2","adr_po_assistant_v1","adr_data_v4","adr_data_v3","adr_data_v2","po_assistant_v4"];
const KEY="adr_po_assistant_v8";
const emptyData={topics:[
{id:"traductions",name:"Gestion des traductions",description:"Suivi du processus de traduction du portail modulaire.",tags:["Portail","Traductions"],adrs:[]},
{id:"portail",name:"Portail Modulaire",description:"Décisions et ateliers liés au portail modulaire.",tags:["Portail","Module"],adrs:[]},
{id:"tracabilite",name:"Traçabilité / EDI",description:"Sujets INCO, EDI, traçabilité et tables WMS.",tags:["EDI","WMS"],adrs:[]},
{id:"mobilog",name:"Mobilog",description:"Sujets Mobilog, cariste, missions et localisation.",tags:["Mobilog"],adrs:[]}
]};
let data=load();let currentTopicId=data.topics[0]?.id,editIndex=null,selectedVersion=null;

function load(){for(const k of KEYS){const raw=localStorage.getItem(k);if(raw){try{let d=normalizeData(JSON.parse(raw));if(d.topics&&d.topics.length)return d}catch(e){console.warn("migration impossible",k,e)}}}return normalizeData(JSON.parse(JSON.stringify(emptyData)))}
function normalizeData(raw){
  if(raw.subjects && !raw.topics){
    raw={topics:raw.subjects.map(s=>({
      id:s.id||makeTopicId(s.name),
      name:s.name||"Sujet sans nom",
      description:s.summary||s.description||"",
      tags:s.tags||[],
      adrs:convertV4AdrArray(s.adr||s.adrs||[]),
      cr:s.cr||[]
    }))};
  }
  if(!raw.topics) raw.topics=[];
  raw.topics=raw.topics.map(t=>{
    const adrs=t.adrs || t.adr || t.meetings || [];
    const converted=Array.isArray(adrs)?convertAdrList(adrs):[];
    return {
      id:t.id||makeTopicId(t.name),
      name:t.name||"Sujet sans nom",
      description:t.description||t.summary||"",
      tags:t.tags||t.badges||[],
      adrs:converted,
      cr:t.cr||[]
    };
  });
  return raw;
}
function convertV4AdrArray(list){
  if(!list.length) return [];
  const groups={};
  list.forEach(a=>{
    const key=(a.titre||a.title||"ADR").trim().toLowerCase();
    if(!groups[key]) groups[key]=[];
    groups[key].push(a);
  });
  const result=[];
  Object.values(groups).forEach(arr=>{
    const normalized=arr.map((a,i)=>norm({...a,version:i+1}));
    const active=normalized[normalized.length-1];
    active.version=normalized.length;
    active.versions=normalized.slice(0,-1).reverse().map(v=>{const copy={...v}; delete copy.versions; copy.archivedAt=new Date().toISOString(); return copy;});
    result.push(active);
  });
  return result;
}
function convertAdrList(list){return list.map(a=>norm(a))}
function id(){return"adr_"+Date.now()+"_"+Math.random().toString(16).slice(2)}
function makeTopicId(name){return String(name||"sujet").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"")||("topic_"+Date.now())}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function topic(){return data.topics.find(t=>t.id===currentTopicId)||data.topics[0]}
function norm(a){return{id:a.id||id(),titre:a.titre||a.title||"ADR sans titre",date:a.date||new Date().toISOString().slice(0,10),participants:Array.isArray(a.participants)?a.participants:(a.participants?String(a.participants).split(",").map(x=>x.trim()).filter(Boolean):[]),objectif:a.objectif||"",pointsAbordes:a.pointsAbordes||a.points_abordes||[],compteRendu:a.compteRendu||a.cr||a.synthese||"",divergences:a.divergences||a.pointsDivergence||[],decisions:a.decisions||[],actions:a.actions||[],risques:a.risques||a.risks||[],questionsOuvertes:a.questionsOuvertes||a.questions||[],motsCles:a.motsCles||a.keywords||[],version:a.version||1,versions:a.versions||[],createdAt:a.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()}}
function archive(t,i){let a=t.adrs[i],v=JSON.parse(JSON.stringify(a));delete v.versions;v.archivedAt=new Date().toISOString();a.versions=a.versions||[];a.versions.unshift(v)}
function render(){renderTopics();renderCurrent();renderSearch();syncSelectors();save()}
function renderTopics(){let q=(topicSearch?.value||"").toLowerCase();topicList.innerHTML=data.topics.filter(t=>t.name.toLowerCase().includes(q)).map(t=>{let vc=t.adrs.reduce((s,a)=>s+(a.versions||[]).length,0);return`<div class="topic ${t.id===currentTopicId?"active":""}" onclick="currentTopicId='${t.id}';render()"><strong>${esc(t.name)}</strong><br><small>${t.adrs.length} ADR · ${vc} versions</small></div>`}).join("")}
function renderCurrent(){let t=topic(),adrs=t.adrs,vers=adrs.flatMap(a=>a.versions||[]),dec=adrs.flatMap(a=>a.decisions||[]),act=adrs.flatMap(a=>a.actions||[]),div=adrs.flatMap(a=>a.divergences||[]),ris=adrs.flatMap(a=>a.risques||[]);topicTitle.textContent=t.name;topicDesc.textContent=t.description||"";topicTags.innerHTML=(t.tags||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join("");kAdr.textContent=adrs.length;kVer.textContent=vers.length;kDec.textContent=dec.length;kAct.textContent=act.length;kDiv.textContent=div.length;kRisk.textContent=ris.length;timeline.innerHTML=adrs.length?adrs.map((a,i)=>`<div class="item" onclick="openAdr(${i})"><h3>${esc(a.date)} — ${esc(a.titre)}</h3><div class="meta">Active v${a.version} · ${(a.versions||[]).length} ancienne(s) version(s)</div><p>${esc((a.objectif||a.compteRendu||"").slice(0,430))}</p><div>${(a.motsCles||[]).map(k=>`<span class="pill">${esc(k)}</span>`).join("")}</div><div class="meta">${(a.decisions||[]).length} décisions · ${(a.actions||[]).length} actions · ${(a.divergences||[]).length} divergences · ${(a.risques||[]).length} risques</div></div>`).join(""):"<p>Aucun ADR.</p>";renderVersions();decisions.innerHTML=table(["ADR","Décision","Impact","Statut"],adrs.flatMap(a=>(a.decisions||[]).map(d=>[a.titre,d.decision||d,d.impact||"",d.statut||""])));actions.innerHTML=table(["ADR","Action","Responsable","Échéance","Priorité","Statut"],adrs.flatMap(a=>(a.actions||[]).map(x=>[a.titre,x.action||x,x.responsable||"",x.echeance||"",x.priorite||"",x.statut||"À faire"])));divergences.innerHTML=table(["ADR","Point à travailler"],adrs.flatMap(a=>(a.divergences||[]).map(x=>[a.titre,x])));risks.innerHTML=table(["ADR","Risque","Impact","Statut"],adrs.flatMap(a=>(a.risques||[]).map(r=>[a.titre,r.risque||r,r.impact||"",r.statut||""])))}
function renderVersions(){let out=[];topic().adrs.forEach((a,ai)=>(a.versions||[]).forEach((v,vi)=>out.push(`<div class="version" onclick="openVersion(${ai},${vi})"><strong>${esc(a.titre)} — ancienne v${esc(v.version)}</strong><br><small>Archivée le ${esc(fmt(v.archivedAt))}</small><p>${esc((v.objectif||v.compteRendu||"").slice(0,260))}</p></div>`)));versions.innerHTML=out.length?out.join(""):"<p>Aucune version historisée.</p>"}
function table(h,rows){if(!rows.length)return"<p>Aucun élément.</p>";return`<table><tr>${h.map(x=>`<th>${esc(x)}</th>`).join("")}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c||"")}</td>`).join("")}</tr>`).join("")}</table>`}
function tab(n,b){document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));document.getElementById("tab-"+n).classList.add("active");b.classList.add("active")}
function newTopic(){let name=prompt("Nom du sujet :");if(!name)return;let tid=makeTopicId(name)+"_"+Date.now();data.topics.push({id:tid,name,description:"",tags:["ADR"],adrs:[]});currentTopicId=tid;render()}
function editTopic(){let t=topic(),d=prompt("Description du sujet :",t.description||"");if(d!==null){t.description=d;render()}}
function openAnalyzer(){syncSelectors();analyzer.classList.remove("hidden")}function closeAnalyzer(){analyzer.classList.add("hidden")}
function syncSelectors(){let opts=data.topics.map(t=>`<option value="${t.id}" ${t.id===currentTopicId?"selected":""}>${esc(t.name)}</option>`).join("");["anTopic","saveTopic"].forEach(x=>{let e=document.getElementById(x);if(e)e.innerHTML=opts});if(mailSelect)mailSelect.innerHTML=(topic().adrs||[]).map((a,i)=>`<option value="${i}">${esc(a.date)} - ${esc(a.titre)} v${a.version}</option>`).join("")}
function makePrompt(){let st=data.topics.find(t=>t.id===anTopic.value)?.name||topic().name,ti=anTitle.value||"Non précisé",tr=transcript.value||"";prompt.value=`Analyse cette transcription Teams et retourne uniquement un JSON valide, sans markdown.

Contexte :
- Je suis Product Owner / Chef de projet IT.
- Sujet cible : ${st}
- Titre optionnel : ${ti}

Structure JSON attendue :
{"titre":"","date":"","participants":[],"objectif":"","pointsAbordes":[],"compteRendu":"","divergences":[],"decisions":[{"decision":"","impact":"","statut":"Validée ou À confirmer"}],"actions":[{"action":"","responsable":"","echeance":"","priorite":"Haute/Moyenne/Basse","statut":"À faire"}],"risques":[{"risque":"","impact":"","statut":"À surveiller ou À traiter"}],"questionsOuvertes":[],"motsCles":[]}

Règles :
- Ne pas inventer.
- Si une information n'est pas identifiable, écrire "Non précisé".
- Reformuler professionnellement.
- Faire ressortir les divergences et points à travailler au prochain atelier.
- Le compteRendu doit être prêt à envoyer par mail.

Transcription :
${tr}`}
function copyPrompt(){navigator.clipboard.writeText(prompt.value);alert("Prompt copié")}
function saveJson(){try{let a=norm(JSON.parse(clean(jsonInput.value))),t=data.topics.find(x=>x.id===saveTopic.value),m=saveMode.value;if(m==="new"||!t.adrs.length)t.adrs.unshift(a);else if(m==="replace"){a.id=t.adrs[0].id;a.version=t.adrs[0].version;a.versions=t.adrs[0].versions||[];t.adrs[0]=a}else{archive(t,0);a.id=t.adrs[0].id;a.version=(t.adrs[0].version||1)+1;a.versions=t.adrs[0].versions||[];t.adrs[0]=a}currentTopicId=t.id;closeAnalyzer();render();alert("ADR enregistré")}catch(e){alert("JSON invalide : "+e.message)}}
function openAdr(i=null){editIndex=i;let a=i===null?norm({titre:"",date:new Date().toISOString().slice(0,10)}):topic().adrs[i];adrTitle.textContent=i===null?"Nouvel ADR":"Modifier ADR";versionNote.textContent=i===null?"Nouvel ADR":`Version active v${a.version}. Anciennes versions : ${(a.versions||[]).length}.`;fill(a);adrModal.classList.remove("hidden")}
function closeAdr(){editIndex=null;adrModal.classList.add("hidden")}
function fill(a){eTitle.value=a.titre||"";eDate.value=a.date||"";eParticipants.value=(a.participants||[]).join(", ");eObjective.value=a.objectif||"";ePoints.value=(a.pointsAbordes||[]).join("\n");eSummary.value=a.compteRendu||"";eDivergences.value=(a.divergences||[]).join("\n");eDecisions.value=(a.decisions||[]).map(d=>d.decision||d).join("\n");eActions.value=(a.actions||[]).map(x=>x.action||x).join("\n");eRisks.value=(a.risques||[]).map(r=>r.risque||r).join("\n");eQuestions.value=(a.questionsOuvertes||[]).join("\n")}
function readEditor(){let old=editIndex===null?null:topic().adrs[editIndex];return norm({id:old?.id,titre:eTitle.value,date:eDate.value,participants:eParticipants.value,objectif:eObjective.value,pointsAbordes:lines("ePoints"),compteRendu:eSummary.value,divergences:lines("eDivergences"),decisions:lines("eDecisions").map(x=>({decision:x,impact:"",statut:""})),actions:lines("eActions").map(x=>({action:x,responsable:"",echeance:"",priorite:"",statut:"À faire"})),risques:lines("eRisks").map(x=>({risque:x,impact:"",statut:"À surveiller"})),questionsOuvertes:lines("eQuestions"),version:editIndex===null?1:old.version,versions:editIndex===null?[]:(old.versions||[])})}
function saveAdr(){let a=readEditor();if(editIndex===null)topic().adrs.unshift(a);else topic().adrs[editIndex]=a;closeAdr();render()}
function saveVersion(){let t=topic(),a=readEditor();if(editIndex!==null){archive(t,editIndex);a.version=(t.adrs[editIndex].version||1)+1;a.versions=t.adrs[editIndex].versions||[];t.adrs[editIndex]=a}else t.adrs.unshift(a);closeAdr();render()}
function deleteAdr(){if(editIndex!==null&&confirm("Supprimer cet ADR actif et son historique ?")){topic().adrs.splice(editIndex,1);closeAdr();render()}}
function openVersion(ai,vi){selectedVersion={ai,vi};let v=topic().adrs[ai].versions[vi];versionDetail.innerHTML=`<h3>${esc(v.titre)} — v${esc(v.version)}</h3><p><b>Date :</b> ${esc(v.date)}</p><p><b>Objectif :</b> ${esc(v.objectif)}</p><h4>Compte rendu</h4><p>${esc(v.compteRendu)}</p><h4>Divergences</h4>${table(["Point"],(v.divergences||[]).map(x=>[x]))}<h4>Décisions</h4>${table(["Décision"],(v.decisions||[]).map(d=>[d.decision||d]))}`;versionModal.classList.remove("hidden")}
function closeVersion(){selectedVersion=null;versionModal.classList.add("hidden")}
function restoreVersion(){if(!selectedVersion)return;let t=topic(),active=t.adrs[selectedVersion.ai],old=active.versions[selectedVersion.vi];archive(t,selectedVersion.ai);let r=norm(old);r.id=active.id;r.version=(active.version||1)+1;r.versions=active.versions||[];t.adrs[selectedVersion.ai]=r;closeVersion();render()}
function openMail(){syncSelectors();mailModal.classList.remove("hidden")}function closeMail(){mailModal.classList.add("hidden")}
function makeMail(){let a=topic().adrs[Number(mailSelect.value||0)];if(!a){mailOutput.value="Aucun ADR sélectionné.";return}mailOutput.value=`Bonjour à tous,

Suite à notre échange, vous trouverez ci-dessous la synthèse des points abordés concernant ${a.titre}.

Objectif
${a.objectif||"Non précisé"}

Points abordés
${(a.pointsAbordes||[]).map(x=>"• "+x).join("\n")}

Décisions
${(a.decisions||[]).map(d=>"• "+(d.decision||d)).join("\n")}

Points de divergence / à travailler
${(a.divergences||[]).map(x=>"• "+x).join("\n")||"• Aucun point de divergence identifié."}

Actions
${(a.actions||[]).map(x=>"• "+(x.action||x)+" — Responsable : "+(x.responsable||"Non précisé")).join("\n")}

N'hésitez pas à compléter ou corriger cette synthèse si nécessaire.

Bonne journée à tous.`}
function copyMail(){navigator.clipboard.writeText(mailOutput.value);alert("Mail copié")}
function renderSearch(){let q=(globalSearch?.value||"").toLowerCase();if(!searchResults)return;if(!q){searchResults.innerHTML="<p>Saisir un mot-clé.</p>";return}let res=[];data.topics.forEach(t=>t.adrs.forEach(a=>{if(JSON.stringify(a).toLowerCase().includes(q))res.push([t.name,a.date,a.titre,"Active v"+a.version,(a.compteRendu||a.objectif||"").slice(0,220)]);(a.versions||[]).forEach(v=>{if(JSON.stringify(v).toLowerCase().includes(q))res.push([t.name,v.date,v.titre,"Historique v"+v.version,(v.compteRendu||v.objectif||"").slice(0,220)])})}));searchResults.innerHTML=table(["Sujet","Date","ADR","Version","Extrait"],res)}
function exportData(){let blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="adr_po_assistant_sauvegarde_v8.json";a.click()}
function importData(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=x=>{try{data=normalizeData(JSON.parse(x.target.result));currentTopicId=data.topics[0]?.id;render();alert("Import réussi : historique converti.")}catch(err){alert("Import impossible : "+err.message)}};r.readAsText(f)}
function clean(v){return v.trim().replace(/^```json/i,"").replace(/^```/i,"").replace(/```$/i,"").trim()}function lines(id){return document.getElementById(id).value.split("\n").map(x=>x.trim()).filter(Boolean)}function fmt(v){try{return new Date(v).toLocaleString("fr-FR")}catch{return v||""}}function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
render();