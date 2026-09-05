import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, FileText, Plus, Save, Send, Sparkles, Tag, Trash2 } from 'lucide-react';
import Panel from '../components/ui/Panel';
import EmptyState from '../components/shared/EmptyState';
import Button from '../components/ui/Button';
import { api } from '../api/client';

const styles = { heading:{display:'flex',justifyContent:'space-between',alignItems:'end',gap:18,marginBottom:28}, eyebrow:{fontSize:11,textTransform:'uppercase',letterSpacing:'0.12em',fontWeight:700,color:'var(--coral)',marginBottom:12}, h1:{fontFamily:"'Space Grotesk', sans-serif",fontSize:'clamp(2rem,4vw,3.3rem)'}, muted:{color:'var(--muted)'}, input:{width:'100%',border:'1px solid var(--line)',borderRadius:10,padding:'11px 13px',background:'var(--surface)',color:'var(--ink)',fontSize:14}, field:{display:'grid',gap:7}, label:{fontSize:12,fontWeight:700,color:'var(--muted)'}, toolbar:{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}, module:{border:'1px solid var(--line)',borderRadius:14,background:'var(--surface)',overflow:'hidden'}, loading:{padding:50,textAlign:'center',color:'var(--muted)'}, skillChip:{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',borderRadius:999,background:'var(--surface2)',border:'1px solid var(--line)',fontSize:12,fontWeight:600} };
const emptyCourse = () => ({name:'',description:'',technicalLevel:1,mode:'Online',price:'',modules:[]});

function CourseList(){
  const [courses,setCourses]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const load=()=>{setLoading(true);api.get('/company/courses').then(setCourses).catch(e=>setError(e.message)).finally(()=>setLoading(false));};
  useEffect(load,[]);
  const remove=async(id)=>{if(!confirm('Delete this course?'))return;await api.delete(`/company/courses/${id}`);load();};
   return <div className="view-enter"><div style={styles.heading}><div><div style={styles.eyebrow}>Employer tools / curriculum</div><h1 style={styles.h1}>Course studio</h1><p style={{...styles.muted,margin:'12px 0 0'}}>Build practical learning paths your team can share with Cebu&apos;s talent.</p></div><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><Link to="/company-courses/new"><Button><Plus size={16}/> Create course</Button></Link></div></div><Panel><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><div><h2>Your courses</h2><p style={{...styles.muted,fontSize:13}}>{courses.length} courses in your company workspace</p></div></div>{loading?<div style={styles.loading}>Loading your curriculum...</div>:error?<EmptyState title="Could not load courses" description={error}/>:courses.length===0?<EmptyState title="Start your course library" description="Create a course, add modules and lessons, then publish it when ready."/>:<div style={{display:'grid',gap:12}}>{courses.map(c=><div key={c.courseId} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:18,alignItems:'center',padding:18,border:'1px solid var(--line)',borderRadius:14}}><div><strong>{c.name}</strong><div style={{...styles.muted,fontSize:12,marginTop:5}}>{c.moduleCount} modules · {c.lessonCount} lessons · {c.mode}</div></div><span style={{color:c.status==='Published'?'var(--teal)':'var(--coral)',fontSize:12,fontWeight:700}}>{c.status}</span><Link to={`/company-courses/${c.courseId}/edit`}>Edit course</Link><button onClick={()=>remove(c.courseId)} aria-label={`Delete ${c.name}`} style={{color:'var(--danger)'}}><Trash2 size={16}/></button></div>)}</div>}</Panel></div>;
}

function CourseEditor(){
  const {courseId}=useParams(); const navigate=useNavigate(); const [course,setCourse]=useState(emptyCourse); const [loading,setLoading]=useState(Boolean(courseId)); const [saving,setSaving]=useState(false); const [error,setError]=useState('');
  const [aiBrief,setAiBrief]=useState('');
  const [aiLevel,setAiLevel]=useState(3);
  const [aiMode,setAiMode]=useState('Online');
  const [aiModuleCount,setAiModuleCount]=useState(4);
  const [aiLessonsPerModule,setAiLessonsPerModule]=useState(3);
  const [aiGenerating,setAiGenerating]=useState(false);
  const [aiError,setAiError]=useState('');
  const [aiSkills,setAiSkills]=useState([]);
  const [aiRationale,setAiRationale]=useState('');
  useEffect(()=>{if(courseId)api.get(`/company/courses/${courseId}`).then(setCourse).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[courseId]);
  const update=(key,value)=>setCourse(c=>({...c,[key]:value}));

  const generateWithAi=async()=>{
    if(!aiBrief.trim()){ setAiError('Describe the course you want the AI to build.'); return; }
    setAiGenerating(true); setAiError('');
    try{
      const draft=await api.post('/company/courses/generate',{
        brief: aiBrief.trim(),
        technicalLevel: Number(aiLevel),
        mode: aiMode,
        moduleCount: Number(aiModuleCount),
        lessonsPerModule: Number(aiLessonsPerModule),
      });
      setCourse({
        name: draft.name || '',
        description: draft.description || '',
        technicalLevel: draft.technicalLevel || 1,
        mode: draft.mode || 'Online',
        price: course.price || '',
        modules: (draft.modules || []).map((m,i)=>({
          name: m.name || '',
          description: m.description || '',
          order: i,
          lessons: (m.lessons || []).map((l,j)=>({ name: l.name || '', description: l.description || '', order: j, contents: [] }))
        }))
      });
      setAiSkills(draft.matchedSkills || []);
      setAiRationale(draft.rationale || '');
      setAiError('');
    }catch(e){ setAiError(e.message); } finally{ setAiGenerating(false); }
  };

  const save=async(publish=false)=>{setSaving(true);try{const payload={...course,price:course.price===''?null:Number(course.price),modules:course.modules.map((m,i)=>({...m,order:i,lessons:m.lessons.map((l,j)=>({...l,order:j,contents:(l.contents||[]).map((c)=>({blockType:c.blockType||'text',content:c.content||''}))}))}))};const saved=courseId?await api.put(`/company/courses/${courseId}`,payload):await api.post('/company/courses',payload);if(publish)await api.post(`/company/courses/${saved.courseId}/publish`);navigate('/company-courses');}catch(e){setError(e.message)}finally{setSaving(false)}};
  if(loading)return <div style={styles.loading}>Loading course studio...</div>;
  return <div className="view-enter"><div style={styles.heading}><div><Link to="/company-courses"><ArrowLeft size={14}/> All courses</Link><div style={styles.eyebrow}>{courseId?'Edit curriculum':'New curriculum'}</div><h1 style={styles.h1}>{courseId?'Shape this course':'Create a course'}</h1></div><div style={styles.toolbar}><Button variant="secondary" onClick={()=>save(false)} disabled={saving}><Save size={15}/> Save draft</Button><Button onClick={()=>save(true)} disabled={saving}><Send size={15}/> Publish</Button></div></div>{error&&<div role="alert" style={{color:'var(--danger)',marginBottom:16}}>{error}</div>}

  {!courseId && (
    <Panel style={{marginBottom:18, border:'1px solid var(--coral)', background:'var(--surface)'}}>
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:12}}>
        <Sparkles size={16} color="var(--coral)" />
        <h2 style={{fontSize:14, fontWeight:700}}>Generate with AI</h2>
        <span style={{...styles.muted,fontSize:12,marginLeft:8}}>Optional — describe what the course should teach and let AI draft it</span>
      </div>
      <div style={{display:'grid',gap:14}}>
        <div style={styles.field}>
          <label style={styles.label}>What should the course teach?</label>
          <textarea rows="4" value={aiBrief} onChange={e=>setAiBrief(e.target.value)} placeholder="e.g. A 4-week onboarding for junior customer support agents — handling inquiries, ticketing tools, tone of voice, and escalation. Learners should be job-ready for a BPO setting." style={styles.input} />
          <span style={{fontSize:12,color:'var(--muted)'}}>{aiBrief.length} / 4000 characters · Grounded in the platform’s skill catalog</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div style={styles.field}><label style={styles.label}>Technical level</label>
            <select value={aiLevel} onChange={e=>setAiLevel(e.target.value)} style={styles.input}>
              <option value={1}>1 — Foundational</option><option value={2}>2 — Beginner</option><option value={3}>3 — Intermediate</option><option value={4}>4 — Advanced</option><option value={5}>5 — Expert</option>
            </select>
          </div>
          <div style={styles.field}><label style={styles.label}>Delivery mode</label>
            <select value={aiMode} onChange={e=>setAiMode(e.target.value)} style={styles.input}>
              <option>Online</option><option>In-Person</option><option>Hybrid</option>
            </select>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div style={styles.field}><label style={styles.label}>Modules</label>
            <select value={aiModuleCount} onChange={e=>setAiModuleCount(e.target.value)} style={styles.input}>
              {[2,3,4,5,6,8,10].map(n=><option key={n} value={n}>{n} modules</option>)}
            </select>
          </div>
          <div style={styles.field}><label style={styles.label}>Lessons per module</label>
            <select value={aiLessonsPerModule} onChange={e=>setAiLessonsPerModule(e.target.value)} style={styles.input}>
              {[1,2,3,4,5,6,8].map(n=><option key={n} value={n}>{n} lessons</option>)}
            </select>
          </div>
        </div>
        {aiError && <div role="alert" style={{color:'var(--danger)',fontSize:13}}>{aiError}</div>}
        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <Button onClick={generateWithAi} disabled={aiGenerating || !aiBrief.trim()}><Sparkles size={16}/> {aiGenerating ? 'Generating…' : 'Generate draft into editor'}</Button>
          <span style={{fontSize:12,color:'var(--muted)'}}>Draft will populate the form below — review and save as draft.</span>
        </div>
        {(aiSkills.length>0 || aiRationale) && (
          <div style={{display:'grid',gap:10,marginTop:4}}>
            {aiRationale && <p style={{...styles.muted,fontSize:13,lineHeight:1.6}}>{aiRationale}</p>}
            {aiSkills.length>0 && (
              <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                <span style={{...styles.label,display:'flex',alignItems:'center',gap:6}}><Tag size={13}/> Matched skills</span>
                {aiSkills.map(s=><span key={s.skillId} style={styles.skillChip}>{s.name}{s.category ? ` · ${s.category}` : ''}</span>)}
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  )}

  <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 300px',gap:20}}><div style={{display:'grid',gap:18}}><Panel><div style={{display:'grid',gap:16}}><div style={styles.field}><label style={styles.label}>Course name</label><input value={course.name} onChange={e=>update('name',e.target.value)} placeholder="e.g. Modern customer support fundamentals" style={styles.input}/></div><div style={styles.field}><label style={styles.label}>Description</label><textarea rows="4" value={course.description||''} onChange={e=>update('description',e.target.value)} placeholder="What will learners be able to do?" style={styles.input}/></div></div></Panel><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><h2>Curriculum</h2><p style={{...styles.muted,fontSize:13}}>Organize the learning journey into focused modules.</p></div><Button variant="secondary" onClick={()=>update('modules',[...course.modules,{name:'',description:'',order:course.modules.length,lessons:[]}])}><Plus size={15}/> Add module</Button></div>{course.modules.length===0?<Panel><EmptyState title="No modules yet" description="Add your first module to give learners a clear starting point."/></Panel>:course.modules.map((module,index)=><ModuleEditor key={index} module={module} index={index} onChange={(value)=>update('modules',course.modules.map((m,i)=>i===index?value:m))} onRemove={()=>update('modules',course.modules.filter((_,i)=>i!==index))} />)}</div></div></div>
}

function ModuleEditor({module,index,onChange,onRemove}){const set=(key,value)=>onChange({...module,[key]:value});return <div style={styles.module}><div style={{display:'flex',alignItems:'center',gap:10,padding:16,background:'var(--surface2)'}}><BookOpen size={17} color="var(--teal)"/><input aria-label={`Module ${index+1} name`} value={module.name} onChange={e=>set('name',e.target.value)} placeholder={`Module ${index+1} title`} style={{...styles.input,flex:1,background:'transparent',border:0,padding:0,fontWeight:700}}/><button onClick={onRemove} aria-label="Remove module" style={{color:'var(--danger)'}}><Trash2 size={15}/></button></div><div style={{padding:12}}>{module.lessons.map((lesson,i)=><LessonEditor key={i} lesson={lesson} index={i} onChange={(value)=>set('lessons',module.lessons.map((l,j)=>j===i?value:l))} onRemove={()=>set('lessons',module.lessons.filter((_,j)=>j!==i))} />)}<button onClick={()=>set('lessons',[...module.lessons,{name:'',description:'',order:module.lessons.length,contents:[]}])} style={{color:'var(--teal)',fontWeight:700,fontSize:12,padding:'12px 0'}}><Plus size={14}/> Add lesson</button></div></div>}

const blockPlaceholders = { text: 'Write a paragraph learners will read…', heading: 'Section heading…', code: 'Paste a code example…' };

// Mirrors MediaService limits so bad files are rejected before upload.
const ATTACH_DOC_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.md', '.png', '.jpg', '.jpeg', '.webp'];
function validateVideoFile(file) {
  if (!(file.type || '').toLowerCase().startsWith('video/')) return 'Only video files are allowed';
  if (file.size > 500 * 1024 * 1024) return 'Video must be 500 MB or smaller';
  return null;
}
function validateAttachDocument(file) {
  const dot = file.name ? file.name.lastIndexOf('.') : -1;
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!ATTACH_DOC_EXTENSIONS.includes(ext)) return 'Unsupported file type';
  if (file.size > 10 * 1024 * 1024) return 'File must be 10 MB or smaller';
  return null;
}

function LessonEditor({lesson,index,onChange,onRemove}){
  const [expanded,setExpanded]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [mediaError,setMediaError]=useState('');
  const set=(key,value)=>onChange({...lesson,[key]:value});
  const contents=lesson.contents||[];
  const media=lesson.media||[];
  const uploadFile=async(file,kind)=>{
    if(!file || !lesson.lessonId)return;
    const precheck=kind==='video'?validateVideoFile(file):validateAttachDocument(file);
    if(precheck){ setMediaError(precheck); return; }
    setMediaError('');
    setUploading(true);
    try{
      const form=new FormData();
      form.append('file',file);
      const res=await api.postForm(`/media/lessons/${lesson.lessonId}/${kind}`,form);
      set('media',[...media,res]);
    }catch(e){ setMediaError(e.status===413?(kind==='video'?'Video must be 500 MB or smaller':'File must be 10 MB or smaller'):(e.message||'Could not attach file')); }
    finally{ setUploading(false); }
  };
  return <div style={{padding:'8px 0',borderBottom:'1px solid var(--line)'}}>
    <div style={{display:'flex',gap:8,alignItems:'center'}}>
      <FileText size={15} color="var(--muted)"/>
      <input aria-label={`Lesson ${index+1} name`} value={lesson.name} onChange={e=>set('name',e.target.value)} placeholder={`Lesson ${index+1} title`} style={{...styles.input,flex:1,fontSize:13}}/>
      <button onClick={()=>setExpanded(v=>!v)} aria-label={`Toggle content for lesson ${index+1}`} aria-expanded={expanded} style={{color:'var(--muted)',display:'grid',placeItems:'center',background:'transparent',border:0,cursor:'pointer',padding:4}}><ChevronDown size={15} style={{transform:expanded?'rotate(180deg)':'none'}}/></button>
      <button onClick={onRemove} aria-label="Remove lesson" style={{color:'var(--danger)'}}><Trash2 size={14}/></button>
    </div>
    {expanded && <div style={{marginTop:8,marginLeft:23,display:'grid',gap:8}}>
      {contents.length===0 && <p style={{...styles.muted,fontSize:12,margin:0}}>No content yet — learners will see an empty lesson.</p>}
      {contents.map((block,k)=><div key={k} style={{display:'grid',gap:6,border:'1px solid var(--line)',borderRadius:10,padding:10}}>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select aria-label={`Content block ${k+1} type`} value={block.blockType||'text'} onChange={e=>set('contents',contents.map((c,j)=>j===k?{...c,blockType:e.target.value}:c))} style={{...styles.input,fontSize:12,padding:'6px 8px',width:'auto'}}>
            <option value="text">Text</option><option value="heading">Heading</option><option value="code">Code</option>
          </select>
          <button onClick={()=>set('contents',contents.filter((_,j)=>j!==k))} aria-label="Remove content block" style={{color:'var(--danger)',background:'transparent',border:0,cursor:'pointer',padding:4}}><Trash2 size={13}/></button>
        </div>
        <textarea aria-label={`Content block ${k+1} text`} rows={(block.blockType||'text')==='code'?4:2} value={block.content||''} onChange={e=>set('contents',contents.map((c,j)=>j===k?{...c,content:e.target.value}:c))} placeholder={blockPlaceholders[block.blockType]||blockPlaceholders.text} style={{...styles.input,fontSize:13,fontFamily:(block.blockType||'text')==='code'?'monospace':'inherit'}}/>
      </div>)}
      <button onClick={()=>set('contents',[...contents,{blockType:'text',content:''}])} style={{color:'var(--teal)',fontWeight:700,fontSize:12,padding:'4px 0',background:'transparent',border:0,cursor:'pointer',display:'flex',alignItems:'center',gap:4,justifySelf:'start'}}><Plus size={13}/> Add content block</button>
      <div style={{borderTop:'1px solid var(--line)',paddingTop:8}}>
        <div style={{...styles.label,marginBottom:6}}>Video & files</div>
        {media.length>0 && <ul style={{listStyle:'none',margin:'0 0 8px',padding:0,display:'grid',gap:6}}>
          {media.map((m)=><li key={m.mediaId} style={{fontSize:12,color:'var(--muted)'}}>{(m.pathFile||'').split('/').pop()} · {(m.type||'').toUpperCase()} · {m.mbSize?.toFixed(1)} MB</li>)}
        </ul>}
        {lesson.lessonId ? <>
          <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
            <label style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,color:'var(--teal)',cursor:uploading?'wait':'pointer'}}>
              <Plus size={13}/> {uploading?'Uploading…':'Attach video'}
              <input type="file" aria-label={`Attach video to lesson ${index+1}`} accept="video/*" style={{display:'none'}} disabled={uploading} onChange={(e)=>{const f=e.target.files?.[0];e.target.value='';if(f)uploadFile(f,'video');}}/>
            </label>
            <label style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,color:'var(--teal)',cursor:uploading?'wait':'pointer'}}>
              <Plus size={13}/> {uploading?'Uploading…':'Attach file'}
              <input type="file" aria-label={`Attach file to lesson ${index+1}`} accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp" style={{display:'none'}} disabled={uploading} onChange={(e)=>{const f=e.target.files?.[0];e.target.value='';if(f)uploadFile(f,'documents');}}/>
            </label>
          </div>
          {mediaError && <p role="alert" style={{color:'var(--danger)',fontSize:12,margin:'6px 0 0'}}>{mediaError}</p>}
        </> : <p style={{...styles.muted,fontSize:12,margin:0}}>Save the course first, then attach video and files here.</p>}
      </div>
    </div>}
  </div>;
}

export default function CourseManagementPage(){const {courseId}=useParams();return courseId||window.location.pathname.endsWith('/new')?<CourseEditor/>:<CourseList/>;}
