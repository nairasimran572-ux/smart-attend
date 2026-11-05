/* AttendSmart - science exhibition demo.
   Face recognition is client-side and stores face descriptors in localStorage.
   Camera access requires localhost or HTTPS. */
const STORAGE_KEY = "attendsmart_v1";
const MODEL_URL = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
let state = loadState();
let currentMode = "combined";
let qrScanner = null;
let faceStream = null;
let faceLoop = null;
let pendingStudent = null;
let pendingEnrollment = null;
let modelsReady = false;
let toastTimer;

const $ = (id) => document.getElementById(id);
const today = () => new Date().toLocaleDateString("en-CA");
const timeNow = () => new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
function loadState(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {students:[],records:[]}}catch{return {students:[],records:[]}}}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));renderAll()}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600)}
function initials(name){return name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
function setStatus(msg,type=""){const el=$("scanStatus");el.textContent=msg;el.className="status-message "+type}
function attendanceFor(studentId,date=today()){return state.records.find(r=>r.studentId===studentId&&r.date===date)}
function markPresent(student,method){const existing=attendanceFor(student.id);if(existing&&existing.status==="Present"){setStatus(`${student.name} is already marked present today.`,"success");toast("Already checked in");return}
  const record={studentId:student.id,date:today(),time:timeNow(),method,status:"Present"};
  if(existing)Object.assign(existing,record);else state.records.push(record);
  saveState();setStatus(`✓ ${student.name} marked present at ${record.time} (${method}).`,"success");toast("Attendance recorded successfully");pendingStudent=null;$("pendingVerify").classList.add("hidden");
}
function navigate(view){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));$(view+"View").classList.add("active");document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===view));$("pageTitle").textContent=({dashboard:"Dashboard",students:"Students",scanner:"Smart scanner",records:"Attendance records",reports:"Reports"})[view];if(view==="records")renderRecords();if(view==="students")renderStudents();if(view==="reports")renderReports()}
function renderAll(){renderDashboard();renderStudents();renderRecords();renderReports()}
function renderDashboard(){const total=state.students.length,present=state.students.filter(s=>attendanceFor(s.id)?.status==="Present").length,absent=total-present,pct=total?Math.round(present/total*100):0;
  $("totalStudents").textContent=total;$("presentToday").textContent=present;$("absentToday").textContent=absent;$("faceProfiles").textContent=state.students.filter(s=>Array.isArray(s.descriptor)).length;$("presentPercent").textContent=pct+"% attendance";$("donutValue").textContent=pct+"%";$("attendanceDonut").style.background=`conic-gradient(var(--green) ${pct*3.6}deg,#edf0f5 0deg)`;$("legendPresent").textContent=present;$("legendAbsent").textContent=absent;
  const recent=state.records.filter(r=>r.date===today()&&r.status==="Present").sort((a,b)=>b.time.localeCompare(a.time)).slice(0,5);
  $("recentList").innerHTML=recent.length?recent.map(r=>{const s=state.students.find(x=>x.id===r.studentId);return s?`<div class="recent-item"><div class="avatar">${escapeHtml(initials(s.name))}</div><div><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(s.studentCode)} · ${escapeHtml(r.method)}</small></div><time>${escapeHtml(r.time)}</time></div>`:""}).join(""):'<div class="empty-state">No attendance recorded yet.</div>';
}
function renderStudents(){const q=($("studentSearch")?.value||"").toLowerCase();const list=state.students.filter(s=>[s.name,s.studentCode,s.className].join(" ").toLowerCase().includes(q));$("studentCountLabel").textContent=`${state.students.length} students`;
  $("studentsTable").innerHTML=list.length?list.map(s=>`<tr><td><div class="student-cell"><div class="avatar">${escapeHtml(initials(s.name))}</div><strong>${escapeHtml(s.name)}</strong></div></td><td>${escapeHtml(s.studentCode)}</td><td>${escapeHtml(s.className)}</td><td><span class="tag">QR READY</span></td><td>${s.descriptor?'<span class="tag green-tag">ENROLLED</span>':'<span class="muted">Not enrolled</span>'}</td><td><button class="action-link" data-action="qr" data-id="${s.id}">QR card</button><button class="action-link" data-action="face" data-id="${s.id}">Enroll face</button><button class="action-link danger-link" data-action="delete" data-id="${s.id}">Delete</button></td></tr>`).join(""):'<tr><td colspan="6" class="empty-state">No students found. Add your first student.</td></tr>';
}
function renderRecords(){const date=$("recordDate").value||today(),filter=$("recordFilter").value;const list=state.students.map(s=>({s,r:attendanceFor(s.id,date)})).filter(x=>filter==="all"||(x.r?.status||"Absent")===filter);
  $("recordsTable").innerHTML=list.length?list.map(({s,r})=>`<tr><td><strong>${escapeHtml(s.name)}</strong></td><td>${escapeHtml(s.studentCode)}</td><td>${date}</td><td>${r?.time||"—"}</td><td>${r?.method||"—"}</td><td>${r?.status==="Present"?'<span class="tag green-tag">PRESENT</span>':'<span class="tag">ABSENT</span>'}</td><td><button class="action-link" data-action="${r?.status==="Present"?"absent":"present"}" data-id="${s.id}">${r?.status==="Present"?"Mark absent":"Mark present"}</button></td></tr>`).join(""):'<tr><td colspan="7" class="empty-state">No students to display.</td></tr>';
}
function renderReports(){const dates=[...new Set(state.records.map(r=>r.date))];const days=dates.length;const present=state.records.filter(r=>r.status==="Present").length;const possible=state.students.length*days;$("totalCheckins").textContent=present;$("overallRate").textContent=possible?Math.round(present/possible*100)+"%":"0%";
  $("reportTable").innerHTML=state.students.length?state.students.map(s=>{const count=state.records.filter(r=>r.studentId===s.id&&r.status==="Present").length;const rate=days?Math.round(count/days*100):0;return `<tr><td><strong>${escapeHtml(s.name)}</strong></td><td>${escapeHtml(s.className)}</td><td>${count}</td><td>${days}</td><td>${rate}%</td></tr>`}).join(""):'<tr><td colspan="5" class="empty-state">Add students to generate a report.</td></tr>';
}
function openStudentDialog(student){$("studentForm").reset();$("editStudentId").value=student?.id||"";$("dialogTitle").textContent=student?"Edit student":"Add student";$("studentName").value=student?.name||"";$("studentId").value=student?.studentCode||"";$("studentClass").value=student?.className||"";$("studentId").disabled=!!student;$("studentDialog").showModal()}
function showQr(student){$("qrStudentName").textContent=student.name;$("qrStudentInfo").textContent=`${student.studentCode} · ${student.className}`;$("qrCode").innerHTML="";new QRCode($("qrCode"),{text:JSON.stringify({app:"AttendSmart",studentId:student.id,code:student.studentCode}),width:190,height:190,colorDark:"#192238",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.H});$("qrDialog").showModal()}
async function loadFaceModels(){if(!window.faceapi){$("modelStatus").textContent="Face recognition library unavailable. Check internet connection.";return false}try{$("modelStatus").textContent="Loading face recognition models…";await Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)]);modelsReady=true;$("modelStatus").textContent="Face recognition models: ready";return true}catch(e){$("modelStatus").textContent="Could not load face models. Check internet and reload.";console.error(e);return false}}
async function captureDescriptor(video){if(!modelsReady)throw new Error("Face models are not ready. Check internet and wait for loading.");const result=await faceapi.detectSingleFace(video,new faceapi.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:.5})).withFaceLandmarks().withFaceDescriptor();if(!result)throw new Error("No clear face detected. Face the camera in good lighting.");return Array.from(result.descriptor)}
async function enrollFace(student){if(!faceStream){toast("Start the camera first from Smart scanner.");navigate("scanner");return}try{const descriptor=await captureDescriptor($("faceVideo"));student.descriptor=descriptor;saveState();toast(`Face enrolled for ${student.name}`)}catch(e){toast(e.message)}}
function distance(a,b){let sum=0;for(let i=0;i<a.length;i++)sum+=(a[i]-b[i])**2;return Math.sqrt(sum)}
async function recognizeFace(){const live=await captureDescriptor($("faceVideo"));const matches=state.students.filter(s=>Array.isArray(s.descriptor)).map(s=>({s,d:distance(live,s.descriptor)})).sort((a,b)=>a.d-b.d);if(!matches.length)throw new Error("No face profiles enrolled yet.");if(matches[0].d>.52)throw new Error("Face not recognized. Try again or use manual attendance.");return matches[0].s}
function parseQr(text){try{const obj=JSON.parse(text);if(obj.app!=="AttendSmart"||!obj.studentId)throw 0;return state.students.find(s=>s.id===obj.studentId&&s.studentCode===obj.code)}catch{return null}}
async function onQrDecoded(text){const student=parseQr(text);if(!student){setStatus("QR code not recognized. Use an AttendSmart student QR card.","error");return}if(currentMode==="qr"){markPresent(student,"QR");return}pendingStudent=student;$("pendingStudentName").textContent=student.name;$("pendingStudentId").textContent=student.studentCode;$("pendingVerify").classList.remove("hidden");setStatus("QR matched. Now look at the camera and verify the student's face.","success")}
async function startCamera(){if(!navigator.mediaDevices?.getUserMedia){setStatus("Camera access requires HTTPS or localhost and a supported browser.","error");return}
  $("cameraPlaceholder").classList.add("hidden");$("startCameraBtn").disabled=true;
  try{
    if(currentMode==="qr"||currentMode==="combined"){
      $("qrReader").style.display="block";$("faceVideo").style.display=currentMode==="combined"?"block":"none";
      if(!qrScanner)qrScanner=new Html5Qrcode("qrReader");
      await qrScanner.start({facingMode:"environment"},{fps:10,qrbox:{width:230,height:230}},onQrDecoded,()=>{});
      if(currentMode==="combined"){
        faceStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:640},height:{ideal:480}},audio:false});
        $("faceVideo").srcObject=faceStream;await $("faceVideo").play();
      }
    }else{await startFaceVideo()}
    $("stopCameraBtn").disabled=false;setStatus("Camera active. Ready to scan.","success");
  }catch(e){console.error(e);$("cameraPlaceholder").classList.remove("hidden");$("startCameraBtn").disabled=false;setStatus("Unable to start camera. Allow camera permission and close other camera apps.","error")}
}
async function startFaceVideo(){faceStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:640},height:{ideal:480}},audio:false});$("faceVideo").srcObject=faceStream;$("faceVideo").style.display="block";$("qrReader").style.display="none";await $("faceVideo").play();faceLoop=setInterval(async()=>{if(!faceStream||currentMode!=="face")return;try{const s=await recognizeFace();markPresent(s,"Face recognition");}catch(e){if(!e.message.includes("No clear face"))setStatus(e.message,"error")}},1800)}
async function stopCamera(){if(qrScanner){try{if(qrScanner.isScanning)await qrScanner.stop()}catch{} }if(faceLoop){clearInterval(faceLoop);faceLoop=null}if(faceStream){faceStream.getTracks().forEach(t=>t.stop());faceStream=null}$("faceVideo").srcObject=null;$("faceVideo").style.display="none";$("qrReader").style.display="none";$("cameraPlaceholder").classList.remove("hidden");$("startCameraBtn").disabled=false;$("stopCameraBtn").disabled=true;setStatus("Camera stopped.");}
async function verifyPendingFace(){if(!pendingStudent){setStatus("Scan a QR code first.","error");return}try{const found=await recognizeFace();if(found.id!==pendingStudent.id){setStatus(`Face mismatch. QR belongs to ${pendingStudent.name}, but another student was recognized.`,"error");return}markPresent(found,"QR + Face")}catch(e){setStatus(e.message,"error")}}
function exportCsv(){const rows=[["Student Name","Student ID","Class","Date","Time","Method","Status"]];state.records.forEach(r=>{const s=state.students.find(x=>x.id===r.studentId);if(s)rows.push([s.name,s.studentCode,s.className,r.date,r.time,r.method,r.status])});const csv=rows.map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="attendsmart-attendance.csv";a.click();URL.revokeObjectURL(a.href)}
function init(){ $("todayLabel").textContent=new Date().toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short",year:"numeric"});$("recordDate").value=today();renderAll();
  document.querySelectorAll(".nav-link").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.view)));document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));$("quickScanBtn").onclick=()=>navigate("scanner");
  $("addStudentBtn").onclick=()=>openStudentDialog();$("closeDialog").onclick=$("cancelDialog").onclick=()=>$("studentDialog").close();$("studentSearch").addEventListener("input",renderStudents);
  $("studentForm").addEventListener("submit",e=>{e.preventDefault();const edit=$("editStudentId").value,name=$("studentName").value.trim(),code=$("studentId").value.trim(),cls=$("studentClass").value.trim();if(!name||!code||!cls)return;const duplicate=state.students.some(s=>s.studentCode.toLowerCase()===code.toLowerCase()&&s.id!==edit);if(duplicate){toast("Student ID already exists.");return}if(edit){const s=state.students.find(x=>x.id===edit);Object.assign(s,{name,className:cls})}else state.students.push({id:crypto.randomUUID(),name,studentCode:code,className:cls,descriptor:null});saveState();$("studentDialog").close();toast("Student saved successfully")});
  $("studentsTable").addEventListener("click", e => {
    const b = e.target.closest("[data-action]");
    if (!b) return;

    const s = state.students.find(x => x.id === b.dataset.id);
    if (!s) return;

    if (b.dataset.action === "qr") {
        showQr(s);
    }

    if (b.dataset.action === "face") {
        pendingEnrollment = s;
        navigate("scanner");

        if (!modelsReady) {
            toast("Wait for face models to load.");
        } else {
            toast("Student selected. Start camera and capture face.");
        }
    }

    if (b.dataset.action === "delete" &&
        confirm(`Delete ${s.name} and their attendance records?`)) {

        state.students = state.students.filter(x => x.id !== s.id);
        state.records = state.records.filter(r => r.studentId !== s.id);

        saveState();
        toast("Student deleted");
    }
});
}
  $("closeQrDialog").onclick=()=>$("qrDialog").close();$("printQrBtn").onclick=()=>window.print();$("recordDate").onchange=renderRecords;$("recordFilter").onchange=renderRecords;
  $("recordsTable").addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(!b)return;const s=state.students.find(x=>x.id===b.dataset.id);if(!s)return;const date=$("recordDate").value||today();let r=state.records.find(x=>x.studentId===s.id&&x.date===date);if(b.dataset.action==="present"){if(r)Object.assign(r,{status:"Present",time:timeNow(),method:"Manual"});else state.records.push({studentId:s.id,date,time:timeNow(),method:"Manual",status:"Present"})}else if(r)r.status="Absent";saveState()});
  $("markAbsentBtn").onclick=()=>{const date=$("recordDate").value||today();state.students.forEach(s=>{if(!attendanceFor(s.id,date))state.records.push({studentId:s.id,date,time:"—",method:"Not checked in",status:"Absent"})});saveState();toast("Remaining students marked absent")};
  $("exportCsvBtn").onclick = exportCsv;
$("startCameraBtn").onclick = startCamera;
$("stopCameraBtn").onclick = stopCamera;
$("verifyFaceBtn").onclick = verifyPendingFace;

// Capture face button
$("captureFaceBtn").onclick = async () => {
    if (!pendingEnrollment) {
        toast("Select a student using Enroll Face first.");
        return;
    }

    if (!faceStream) {
        toast("Start the camera first.");
        return;
    }

    $("captureFaceBtn").disabled = true;
    await enrollFace(pendingEnrollment);
    $("captureFaceBtn").disabled = false;
};
  document.querySelectorAll(".mode-card").forEach(b=>b.onclick=async()=>{if(faceStream||qrScanner?.isScanning)await stopCamera();currentMode=b.dataset.mode;document.querySelectorAll(".mode-card").forEach(x=>x.classList.toggle("selected",x===b));pendingStudent=null;$("pendingVerify").classList.add("hidden");setStatus("Mode changed. Start the camera to continue.")});
  loadFaceModels();
}
document.addEventListener("DOMContentLoaded", init);

window.addEventListener("beforeunload", () => {
  if (faceStream) faceStream.getTracks().forEach(t => t.stop());
});

// Allow index.html to call this function after scanning an uploaded QR image
window.onQrDecoded = onQrDecoded;
