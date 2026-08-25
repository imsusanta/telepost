import{E as r,D as $e,Z as Qe,z as f,p as Re,v as e,h as Ce,r as F,x as oe,i as we,o as ce,s as X,t as Be,m,B as ee,C as te,F as se,G as ae,R as y,a5 as xe,j as He,l as Ve,T as de,b as Je,a7 as fe,y as je,n as w}from"./index-z8zykeVK.js";import{m as q}from"./channelService-B2iaFZtm-OdxDkNlt.js";import{p as g}from"./label-Be4nCLIY-B6h3Qda6.js";import{i as Z}from"./textarea-BCUWYMRv-etXYOUDC.js";import{P as ue,k as me,q as he,z as pe,U as _}from"./select-BOKFeYIC-DeyZ1HGI.js";import{F as Ke}from"./switch-DiXgzZJ9--UI_xc5p.js";import{v as Te,n as qe,c as Se,p as Ie,g as ke,d as ze,m as Pe,f as Ue}from"./alert-dialog-D8tH-eLa-JKTxFXBQ.js";import{E as We}from"./scroll-area-BbHltTz0-BI4mQDqI.js";import{u as _e}from"./badge-BovKcf6U-D6bIAk5g.js";import{a as ve}from"./plus-DP3b62TC-DUQ-xQCx.js";import{c as Ee}from"./pencil-BxjS08DC-SwvNNXVf.js";import{c as Ae}from"./trash-2-CPFNYM0i-S53tyroG.js";import{n as R,c as K}from"./alert-E3c7nJ4c-VFHvssuz.js";import{c as W}from"./message-circle-CSmXTHcH-CVCn-F0d.js";import{r as ge}from"./circle-alert-PUjncj8x-DukKcuBq.js";import{e as Ze}from"./book-open-4WNG5Rkf-Lhlbrxbm.js";import{e as Xe}from"./zap-BKStrJkI-DebRupv1.js";import"./chevron-down-CKuAReCd-mVo1nRL5.js";const k=[{id:"general",name:"General Knowledge",subject:"General",description:"Broad general knowledge quizzes covering various topics",prompt:`You are a quiz generator for general knowledge topics.

GUIDELINES:
- Create questions that test factual knowledge and comprehension
- Cover a variety of subtopics within the given subject
- Include a mix of straightforward facts and analytical questions
- Ensure all information is accurate and up-to-date
- Make questions clear and unambiguous
- Provide helpful explanations that teach the correct answer

QUESTION TYPES:
- Factual recall questions
- Definition and concept questions
- Comparison questions
- Application-based questions`},{id:"mathematics",name:"Mathematics",subject:"Mathematics",description:"Math problems including arithmetic, algebra, geometry, and more",prompt:`You are a mathematics quiz generator.

GUIDELINES:
- Create questions that test mathematical understanding and problem-solving
- Include step-by-step reasoning in explanations
- Ensure all calculations are correct
- Cover various mathematical concepts based on the topic
- Use clear mathematical notation
- Create plausible wrong options based on common mistakes

QUESTION TYPES:
- Calculation problems
- Word problems with real-world applications
- Concept understanding questions
- Formula application questions
- Pattern recognition

IMPORTANT:
- Double-check all calculations before providing answers
- Make distractor options (wrong answers) based on common computational errors
- Explain the solution method in the explanation`},{id:"science",name:"Science",subject:"Science",description:"Scientific concepts in physics, chemistry, biology, and earth science",prompt:`You are a science quiz generator.

GUIDELINES:
- Create questions that test scientific understanding and reasoning
- Base questions on established scientific facts and theories
- Include practical applications and real-world examples
- Explain underlying principles in the explanations
- Cover terminology, concepts, and processes

QUESTION TYPES:
- Conceptual understanding
- Scientific terminology
- Process and mechanism questions
- Experimental reasoning
- Data interpretation

IMPORTANT:
- Ensure scientific accuracy in all questions and answers
- Use correct scientific terminology
- Relate concepts to observable phenomena when possible
- Include the "why" in explanations, not just the "what"`},{id:"history",name:"History",subject:"History",description:"Historical events, figures, timelines, and civilizations",prompt:`You are a history quiz generator.

GUIDELINES:
- Create questions that test knowledge of historical events, figures, and periods
- Ensure dates, names, and facts are historically accurate
- Include questions about causes, effects, and significance
- Cover different aspects: political, social, cultural, economic
- Provide context in explanations to help understanding

QUESTION TYPES:
- Timeline and date questions
- Historical figure identification
- Cause and effect relationships
- Significance and impact questions
- Cultural and social history

IMPORTANT:
- Verify all historical facts and dates
- Present multiple perspectives where appropriate
- Connect events to broader historical patterns in explanations
- Avoid anachronistic or presentist interpretations`},{id:"language",name:"Language & Literature",subject:"Language",description:"Grammar, vocabulary, literature, and language arts",prompt:`You are a language and literature quiz generator.

GUIDELINES:
- Create questions that test language skills and literary knowledge
- Include grammar, vocabulary, and comprehension questions
- Test knowledge of literary works, authors, and techniques
- Ensure grammatical accuracy in all questions
- Provide clear explanations of rules and concepts

QUESTION TYPES:
- Grammar and syntax
- Vocabulary and definitions
- Literary analysis
- Author and work identification
- Figure of speech recognition

IMPORTANT:
- Model correct language usage in all questions
- Explain grammatical rules clearly
- Reference specific examples when discussing literature
- Include etymology or word origins in vocabulary explanations`},{id:"geography",name:"Geography",subject:"Geography",description:"Physical and human geography, maps, and world cultures",prompt:`You are a geography quiz generator.

GUIDELINES:
- Create questions about physical and human geography
- Include locations, landmarks, and geographical features
- Test knowledge of countries, capitals, and regions
- Cover climate, ecosystems, and natural resources
- Include cultural geography and demographics

QUESTION TYPES:
- Location identification
- Physical features and processes
- Political geography
- Cultural and economic geography
- Map reading and interpretation

IMPORTANT:
- Ensure all geographical facts are current and accurate
- Include both physical and human geography aspects
- Explain geographical relationships in answers
- Consider regional variations and context`},{id:"current-affairs",name:"Current Affairs",subject:"Current Affairs",description:"Recent news, events, and contemporary issues",prompt:`You are a current affairs quiz generator.

GUIDELINES:
- Create questions about recent events and contemporary issues
- Cover politics, economics, sports, science, and culture
- Focus on significant and impactful events
- Ensure information is factual and verified
- Provide context and background in explanations

QUESTION TYPES:
- Recent event identification
- Key figure recognition
- Policy and decision questions
- International relations
- Awards and achievements

IMPORTANT:
- Base questions only on verified information
- Present facts objectively without bias
- Provide sufficient context for understanding
- Focus on events with lasting significance`},{id:"technology",name:"Technology & Computing",subject:"Technology",description:"Computer science, IT, programming, and digital technology",prompt:`You are a technology and computing quiz generator.

GUIDELINES:
- Create questions about technology concepts and applications
- Cover hardware, software, networking, and programming
- Include both theoretical knowledge and practical skills
- Test understanding of tech terminology and acronyms
- Explain technical concepts clearly in explanations

QUESTION TYPES:
- Technical terminology
- Concept understanding
- Problem-solving scenarios
- Technology history and evolution
- Best practices and standards

IMPORTANT:
- Ensure technical accuracy in all questions
- Use industry-standard terminology
- Explain complex concepts in accessible terms
- Include practical applications and examples`},{id:"medical",name:"Medical & Health",subject:"Medical",description:"Human anatomy, diseases, health, and medical science",prompt:`You are a medical and health quiz generator.

GUIDELINES:
- Create questions about human health and medical science
- Cover anatomy, physiology, diseases, and treatments
- Ensure all medical information is accurate and current
- Include preventive health and wellness topics
- Provide clear, educational explanations

QUESTION TYPES:
- Anatomy and physiology
- Disease and condition identification
- Treatment and medication questions
- Public health concepts
- Medical terminology

IMPORTANT:
- Ensure medical accuracy - verify all facts
- Use correct medical terminology
- Do not provide medical advice
- Focus on educational content for learning
- Include prevention and health promotion`},{id:"competitive-exam",name:"Competitive Exam Prep",subject:"Competitive Exams",description:"Questions formatted for competitive exam preparation",prompt:`You are a competitive exam preparation quiz generator.

GUIDELINES:
- Create questions in competitive exam format
- Include reasoning, quantitative aptitude, and verbal ability
- Focus on problem-solving efficiency
- Create challenging but fair questions
- Provide time-saving techniques in explanations

QUESTION TYPES:
- Logical reasoning
- Quantitative aptitude
- Verbal reasoning
- Data interpretation
- General knowledge

IMPORTANT:
- Follow standard competitive exam patterns
- Include shortcuts and tricks in explanations
- Ensure questions can be solved within time limits
- Create options that test deep understanding
- Avoid ambiguous or controversial questions`},{id:"custom",name:"Custom Subject",subject:"Custom",description:"Create your own custom system prompt",prompt:`You are a quiz generator for [YOUR SUBJECT].

GUIDELINES:
- Create questions that accurately test knowledge of the subject
- Ensure all information is correct and relevant
- Include a variety of question types
- Make explanations helpful and educational
- Adapt difficulty to the target audience

QUESTION TYPES:
- [Define your question types]

IMPORTANT:
- [Add your specific requirements]
- [Include any subject-specific rules]
- [Note any special considerations]`}];function et(p){return k.find(l=>l.id===p)}function tt(p,l,c,d){let u;d&&(u=k.find(o=>o.id===d)),u||(u=k.find(o=>o.subject.toLowerCase()===p.toLowerCase())||k[0]);const v={bn:`

LANGUAGE: Generate all content in Bengali (বাংলা). Use Bengali script and culturally relevant examples.`,en:`

LANGUAGE: Generate all content in English. Use clear, accessible language.`,hi:`

LANGUAGE: Generate all content in Hindi (हिन्दी). Use Hindi script and culturally relevant examples.`};let s=u.prompt;return s.includes("[YOUR SUBJECT]")&&(s=s.replace("[YOUR SUBJECT]",p||u.subject)),s+=v[l]||v.en,s+=`

CONTENT GUIDELINES:
- Don't generate Bangladesh related topics. If the topic is related to India, then generate the content.`,s}class B{static async getTemplates(l){const{data:c,error:d}=await f.from("user_templates").select("*").or(`user_id.eq.${l},is_default.eq.true`).order("is_default",{ascending:!1}).order("name",{ascending:!0});if(d)throw d;return c||[]}static async getTemplate(l){const{data:c,error:d}=await f.from("user_templates").select("*").eq("id",l).maybeSingle();if(d)throw d;return c}static async createTemplate(l,c){const{data:d,error:u}=await f.from("user_templates").insert({user_id:l,name:c.name,subject:c.subject,description:c.description||null,prompt:c.prompt,is_default:!1}).select().single();if(u)throw u;return d}static async updateTemplate(l,c){const{data:d,error:u}=await f.from("user_templates").update({...c,updated_at:new Date().toISOString()}).eq("id",l).select().single();if(u)throw u;return d}static async deleteTemplate(l){const{error:c}=await f.from("user_templates").delete().eq("id",l);if(c)throw c}static async isTemplateNameTaken(l,c,d){let u=f.from("user_templates").select("id").eq("user_id",l).eq("name",c);d&&(u=u.neq("id",d));const{data:v,error:s}=await u.maybeSingle();if(s)throw s;return!!v}static toSystemPromptFormat(l){return{id:l.id,name:l.name,subject:l.subject,description:l.description||"",prompt:l.prompt,isCustom:!l.is_default,userId:l.user_id}}}function st({open:p,onOpenChange:l,onTemplateSelect:c}){const[d,u]=r.useState([]),[v,s]=r.useState(!1),[o,D]=r.useState(null),[z,b]=r.useState(!1),[ne,S]=r.useState(!1),[I,O]=r.useState(null),[P,E]=r.useState(!1),[T,G]=r.useState(!1),[h,C]=r.useState({name:"",subject:"",description:"",prompt:""});r.useEffect(()=>{p&&(M(),H())},[p]);const H=async()=>{try{const{data:{user:a}}=await f.auth.getUser();if(!a)return;const{data:i}=await f.from("profiles").select("role").eq("id",a.id).single();G(i?.role==="super_admin")}catch(a){console.error("Error checking admin status:",a)}},M=async()=>{s(!0);try{const{data:{user:a}}=await f.auth.getUser();if(!a)return;let i=await B.getTemplates(a.id);i.length===0&&(i=k.map(j=>({id:j.id,user_id:null,name:j.name,subject:j.subject,description:j.description,prompt:j.prompt,is_default:!0,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}))),u(i)}catch(a){console.error("Error loading templates:",a);const i=k.map(j=>({id:j.id,user_id:null,name:j.name,subject:j.subject,description:j.description,prompt:j.prompt,is_default:!0,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}));u(i)}finally{s(!1)}},U=a=>{a?(D(a),C({name:a.name,subject:a.subject,description:a.description||"",prompt:a.prompt})):(D(null),C({name:"",subject:"",description:"",prompt:`You are a quiz generator for [YOUR SUBJECT].

GUIDELINES:
- Create questions that accurately test knowledge of the subject
- Ensure all information is correct and relevant
- Include a variety of question types
- Make explanations helpful and educational
- Follow Government Competitive Exam Standard MCQs

QUESTION TYPES:
- [Define your question types]

IMPORTANT:
- [Add your specific requirements]`})),b(!0)},Y=()=>{b(!1),D(null),C({name:"",subject:"",description:"",prompt:""})},L=async()=>{if(!h.name.trim()||!h.subject.trim()||!h.prompt.trim()){w.error("Please fill in all required fields");return}E(!0);try{const{data:{user:a}}=await f.auth.getUser();if(!a)throw new Error("Not authenticated");if(await B.isTemplateNameTaken(a.id,h.name,o&&!o.is_default?o.id:void 0)){w.error("A template with this name already exists"),E(!1);return}o&&!o.is_default?(await B.updateTemplate(o.id,h),w.success("Template updated successfully")):(await B.createTemplate(a.id,h),w.success(o?.is_default?"Template saved as a new custom template":"Template created successfully")),Y(),M()}catch(a){console.error("Error saving template:",a);const i=a.message||"Failed to save template";w.error(`Failed to save template: ${i}`),(i.includes('relation "user_templates" does not exist')||i.includes("Could not find the table")||a.code==="PGRST205")&&w.error("Database table missing. Please run the migration script in Supabase SQL Editor.",{duration:1e4})}finally{E(!1)}},V=async()=>{if(I){if(I.is_default&&!T){w.error("You cannot delete default templates."),S(!1);return}try{await B.deleteTemplate(I.id),w.success("Template deleted successfully"),S(!1),O(null),M()}catch(a){console.error("Error deleting template:",a);const i=a.message||"Failed to delete template";w.error(`Failed to delete template: ${i}`)}}},J=a=>{O(a),S(!0)},$=a=>{c&&c(a.id),l(!1)};return e.jsxs(e.Fragment,{children:[e.jsx(X,{open:p,onOpenChange:l,children:e.jsxs(ee,{className:"max-w-3xl max-h-[80vh]",children:[e.jsxs(te,{children:[e.jsxs(se,{className:"flex items-center gap-2",children:[e.jsx(fe,{className:"w-5 h-5"}),"Manage Templates"]}),e.jsx(ae,{children:"Create and manage your quiz templates. All templates can be edited or deleted."})]}),e.jsx("div",{className:"flex justify-end mb-4",children:e.jsxs(m,{onClick:()=>U(),size:"sm",children:[e.jsx(ve,{className:"w-4 h-4 mr-2"}),"New Template"]})}),v?e.jsx("div",{className:"flex items-center justify-center py-8",children:e.jsx(je,{className:"w-6 h-6 animate-spin"})}):e.jsx(We,{className:"h-[400px] pr-4",children:e.jsxs("div",{className:"space-y-3",children:[d.map(a=>e.jsxs("div",{className:"flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors",children:[e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"font-medium truncate",children:a.name}),a.is_default?e.jsx(_e,{variant:"secondary",className:"text-xs",children:"Default"}):e.jsx(_e,{variant:"outline",className:"text-xs",children:"Custom"})]}),e.jsx("p",{className:"text-sm text-muted-foreground truncate",children:a.description||a.subject})]}),e.jsxs("div",{className:"flex items-center gap-2 ml-4",children:[e.jsx(m,{variant:"outline",size:"sm",onClick:()=>$(a),children:"Use"}),(T||!a.is_default)&&e.jsxs(e.Fragment,{children:[e.jsx(m,{variant:"ghost",size:"icon",onClick:()=>U(a),children:e.jsx(Ee,{className:"w-4 h-4"})}),e.jsx(m,{variant:"ghost",size:"icon",className:"text-destructive hover:text-destructive",onClick:()=>J(a),children:e.jsx(Ae,{className:"w-4 h-4"})})]}),!T&&a.is_default&&e.jsx(m,{variant:"ghost",size:"icon",onClick:()=>U(a),title:"Save as custom template",children:e.jsx(Ee,{className:"w-4 h-4"})})]})]},a.id)),d.length===0&&e.jsx("div",{className:"text-center py-8 text-muted-foreground",children:"No templates found. Create your first custom template!"})]})})]})}),e.jsx(X,{open:z,onOpenChange:a=>!a&&Y(),children:e.jsxs(ee,{className:"max-w-2xl max-h-[90vh] overflow-y-auto",children:[e.jsxs(te,{children:[e.jsx(se,{children:o?"Edit Template":"Create New Template"}),e.jsx(ae,{children:o?"Update your custom template settings":"Create a new quiz template with custom guidelines"})]}),e.jsxs("div",{className:"space-y-4 py-4",children:[e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(g,{htmlFor:"name",children:"Template Name *"}),e.jsx(y,{id:"name",placeholder:"e.g., Indian History",value:h.name,onChange:a=>C({...h,name:a.target.value})})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(g,{htmlFor:"subject",children:"Subject *"}),e.jsx(y,{id:"subject",placeholder:"e.g., History",value:h.subject,onChange:a=>C({...h,subject:a.target.value})})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(g,{htmlFor:"description",children:"Description"}),e.jsx(y,{id:"description",placeholder:"Brief description of this template",value:h.description,onChange:a=>C({...h,description:a.target.value})})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(g,{htmlFor:"prompt",children:"System Prompt *"}),e.jsx(Z,{id:"prompt",placeholder:"Enter the AI system prompt for this template...",value:h.prompt,onChange:a=>C({...h,prompt:a.target.value}),className:"min-h-[200px] font-mono text-sm"}),e.jsx("p",{className:"text-xs text-muted-foreground",children:"This prompt guides the AI when generating quiz questions for this template."})]})]}),e.jsxs(xe,{children:[e.jsx(m,{variant:"outline",onClick:Y,disabled:P,children:"Cancel"}),e.jsxs(m,{onClick:L,disabled:P,children:[P&&e.jsx(je,{className:"w-4 h-4 mr-2 animate-spin"}),o?"Update Template":"Create Template"]})]})]})}),e.jsx(Te,{open:ne,onOpenChange:S,children:e.jsxs(qe,{children:[e.jsxs(Se,{children:[e.jsx(Ie,{children:"Delete Template"}),e.jsxs(ke,{children:['Are you sure you want to delete "',I?.name,'"? This action cannot be undone.']})]}),e.jsxs(ze,{children:[e.jsx(Pe,{children:"Cancel"}),e.jsx(Ue,{onClick:V,className:"bg-destructive text-destructive-foreground",children:"Delete"})]})]})})]})}function bt(){const[p,l]=r.useState([]),[c,d]=r.useState(!0),[u,v]=r.useState(!1),[s,o]=r.useState(null),[D,z]=r.useState(!1),[b,ne]=r.useState({}),[S,I]=r.useState(null),[O,P]=r.useState(!1),[E,T]=r.useState(!1),[G,h]=r.useState(null),[C,H]=r.useState(""),[M,U]=r.useState(!1),[Y,L]=r.useState(!1),[V,J]=r.useState(null),[$,a]=r.useState(!1),{toast:i}=$e(),j=Qe(),[x,Q]=r.useState({name:"",description:"",telegram_channel_id:"",telegram_bot_token:""}),A=r.useCallback(async()=>{try{const{data:{user:t}}=await f.auth.getUser();if(!t)return;const n=await q.getUserChannels(t.id);l(n)}catch(t){const n=t instanceof Error?t.message:"Failed to load channels";i({title:"Error",description:n,variant:"destructive"})}finally{d(!1)}},[i]);r.useEffect(()=>{A()},[A]);const{getLimit:Fe,isSuperAdmin:ye}=Re(),ie=Fe("max_telegram_channels")||1,De=async()=>{if(!x.name.trim()){i({title:"Validation Error",description:"Channel name is required",variant:"destructive"});return}if(!ye&&p.length>=ie){i({title:"Limit Reached",description:`Your current plan allows max ${ie} channel(s). Please upgrade for more.`,variant:"destructive"});return}P(!0);try{const{data:{user:t}}=await f.auth.getUser();if(!t)return;await q.createChannel(t.id,x),i({title:"Success",description:"Channel created successfully"}),v(!1),re(),A()}catch(t){i({title:"Error",description:t instanceof Error?t.message:"Failed to create channel",variant:"destructive"})}finally{P(!1)}},re=()=>{Q({name:"",description:"",telegram_channel_id:"",telegram_bot_token:""}),h(null)},Oe=async()=>{const t=x.telegram_channel_id.trim();if(!t){i({title:"Missing chat ID",description:"Please enter the Telegram channel/chat ID to test connection",variant:"destructive"});return}T(!0),h(null);try{const n=await q.testTelegramConnection(t,void 0);h(n),n.success?i({title:"Connection Successful",description:n.message}):i({title:"Connection Failed",description:n.message,variant:"destructive"})}catch(n){const N=n instanceof Error?n.message:"Test failed";h({success:!1,message:N}),i({title:"Error",description:N,variant:"destructive"})}finally{T(!1)}},Ge=async()=>{if(!s)return;const t=s.telegram_channel_id?.trim();if(!t){i({title:"Missing chat ID",description:"Please enter the Telegram channel/chat ID to test connection",variant:"destructive"});return}T(!0);try{const n=await q.testTelegramConnection(t,s.id);n.success?i({title:"Connection Successful",description:n.message}):i({title:"Connection Failed",description:n.message,variant:"destructive"})}catch(n){i({title:"Error",description:n instanceof Error?n.message:"Connection test failed",variant:"destructive"})}finally{T(!1)}},Me=async()=>{if(V){a(!0);try{const{data:{user:t}}=await f.auth.getUser();if(!t)return;await q.deleteChannel(V,t.id),i({title:"Success",description:"Channel deleted successfully"}),L(!1),J(null),A()}catch(t){i({title:"Error",description:t instanceof Error?t.message:"Failed to delete channel",variant:"destructive"})}finally{a(!1)}}},Ye=async t=>{try{const{data:{user:n}}=await f.auth.getUser();if(!n)return;await q.updateChannel(t.id,n.id,{name:t.name.trim(),description:t.description?.trim()||"",telegram_channel_id:t.telegram_channel_id?.trim()||void 0,telegram_bot_token:t.telegram_bot_token?.trim()||void 0,settings:t.settings}),i({title:"Success",description:"Settings updated successfully"}),A()}catch(n){i({title:"Error",description:n instanceof Error?n.message:"Failed to update settings",variant:"destructive"})}},be=r.useCallback(async(t,n)=>{try{const N=await q.getChannelStats(t,n);ne(le=>({...le,[t]:{documentCount:N.documentCount,quizCount:N.quizCount}}))}catch{}},[]),Le=async t=>{if(console.log("handleManualGeneration called for channel:",t.id,t.name),console.log("Channel settings:",t.settings),console.log("telegram_channel_id:",t.telegram_channel_id),!t.telegram_channel_id){i({title:"Error",description:"Please configure Telegram credentials first",variant:"destructive"});return}if(!t.settings.default_subject){console.log("No default_subject set for channel"),i({title:"Error",description:"Please set a default subject for quiz generation",variant:"destructive"});return}I(t.id);try{console.log("Calling ChannelService.triggerAutoGeneration...");const n=await q.triggerAutoGeneration(t.id,!0);if(console.log("triggerAutoGeneration result:",n),!n.success)throw new Error(n.message||"Failed to generate quiz");i({title:"Success",description:`Quiz generated and sent to ${t.name}`}),A()}catch(n){console.error("Quiz generation error:",n),i({title:"Error",description:n instanceof Error?n.message:"Failed to generate quiz. Please try again.",variant:"destructive"})}finally{I(null)}},Ne=t=>{if(!s||!t)return;const n=et(t);if(!n)return;const N=n.id!=="general"&&n.id!=="custom"?n.subject:s.settings.default_subject,le=tt(N,s.settings.default_language,"",t);o({...s,settings:{...s.settings,system_prompt:le,default_subject:N}}),H(t),i({title:"Template Applied",description:`Applied "${n.name}" template. You can customize the prompt further.`})};return r.useEffect(()=>{const t=async()=>{const{data:{user:n}}=await f.auth.getUser();n&&await Promise.all(p.map(N=>be(N.id,n.id)))};p.length>0&&t()},[p,be]),c?e.jsx(Ce,{children:e.jsxs("div",{className:"container mx-auto p-6",children:[e.jsxs("div",{className:"flex justify-between items-center mb-6",children:[e.jsxs("div",{children:[e.jsx(F,{className:"h-8 w-32 mb-2"}),e.jsx(F,{className:"h-4 w-64"})]}),e.jsx(F,{className:"h-10 w-32"})]}),e.jsx("div",{className:"grid gap-6 md:grid-cols-2 lg:grid-cols-3",children:Array.from({length:3}).map((t,n)=>e.jsxs(oe,{children:[e.jsxs(we,{children:[e.jsx(F,{className:"h-6 w-32 mb-2"}),e.jsx(F,{className:"h-4 w-48"})]}),e.jsx(ce,{children:e.jsx(F,{className:"h-20 w-full"})})]},n))})]})}):e.jsx(Ce,{children:e.jsxs("div",{className:"container mx-auto p-6",children:[e.jsxs("div",{className:"flex justify-between items-center mb-6",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-3xl font-bold",children:"Channels"}),e.jsxs("p",{className:"text-muted-foreground",children:["Manage your Telegram channels ",ye?`(${p.length} active)`:`(${p.length} / ${ie} used)`]})]}),e.jsxs(X,{open:u,onOpenChange:t=>{v(t),t||re()},children:[e.jsx(Be,{asChild:!0,children:e.jsxs(m,{children:[e.jsx(ve,{className:"mr-2 h-4 w-4"}),"Create Channel"]})}),e.jsxs(ee,{children:[e.jsxs(te,{children:[e.jsx(se,{children:"Create New Channel"}),e.jsx(ae,{children:"Add a new Telegram channel with its own knowledge base"})]}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx(g,{htmlFor:"name",children:"Channel Name *"}),e.jsx(y,{id:"name",value:x.name,onChange:t=>Q({...x,name:t.target.value}),placeholder:"My Channel"}),!x.name.trim()&&x.name!==""&&e.jsx("p",{className:"text-xs text-destructive mt-1",children:"Channel name is required"})]}),e.jsxs("div",{children:[e.jsx(g,{htmlFor:"description",children:"Description (Optional)"}),e.jsx(Z,{id:"description",value:x.description,onChange:t=>Q({...x,description:t.target.value}),placeholder:"Channel description..."})]}),e.jsxs("div",{children:[e.jsx(g,{htmlFor:"telegram_channel_id",children:"Telegram Chat ID (Optional)"}),e.jsx(y,{id:"telegram_channel_id",value:x.telegram_channel_id,onChange:t=>Q({...x,telegram_channel_id:t.target.value}),placeholder:"@mychannel or -1001234567890"})]}),e.jsxs("div",{children:[e.jsx(g,{htmlFor:"telegram_bot_token",children:"Telegram Bot Token (Optional)"}),e.jsx(y,{id:"telegram_bot_token",type:"password",value:x.telegram_bot_token,onChange:t=>Q({...x,telegram_bot_token:t.target.value}),placeholder:"Enter bot token from @BotFather"}),e.jsx("p",{className:"text-xs text-muted-foreground mt-1",children:"Required to post to this channel. You can also set a global token in Settings."})]}),x.telegram_channel_id&&e.jsxs("div",{className:"space-y-2",children:[e.jsxs(m,{type:"button",variant:"outline",size:"sm",onClick:Oe,disabled:E||!x.telegram_channel_id,className:"w-full",children:[e.jsx(W,{className:"mr-2 h-4 w-4"}),E?"Testing...":"Test Connection"]}),G&&e.jsxs(R,{variant:G.success?"default":"destructive",children:[e.jsx(ge,{className:"h-4 w-4"}),e.jsx(K,{className:"text-xs",children:G.message})]})]})]}),e.jsxs(xe,{children:[e.jsx(m,{variant:"outline",onClick:()=>{v(!1),re()},children:"Cancel"}),e.jsx(m,{onClick:De,disabled:!x.name.trim()||O,children:O?"Creating...":"Create"})]})]})]})]}),p.length===0?e.jsx(oe,{children:e.jsxs(ce,{className:"flex flex-col items-center justify-center py-12",children:[e.jsx(W,{className:"h-12 w-12 text-muted-foreground mb-4"}),e.jsx("p",{className:"text-muted-foreground mb-4",children:"No channels yet"}),e.jsxs(m,{onClick:()=>v(!0),children:[e.jsx(ve,{className:"mr-2 h-4 w-4"}),"Create Your First Channel"]})]})}):e.jsx("div",{className:"grid gap-6 md:grid-cols-2 lg:grid-cols-3",children:p.map(t=>e.jsxs(oe,{children:[e.jsx(we,{children:e.jsxs("div",{className:"flex justify-between items-start",children:[e.jsxs("div",{children:[e.jsx(He,{children:t.name}),e.jsx(Ve,{children:t.description||"No description"})]}),e.jsx(m,{variant:"ghost",size:"sm",onClick:()=>{J(t.id),L(!0)},className:"text-muted-foreground hover:text-destructive",children:e.jsx(Ae,{className:"h-4 w-4"})})]})}),e.jsxs(ce,{className:"space-y-4",children:[b[t.id]&&e.jsxs("div",{className:"flex gap-4 text-xs text-muted-foreground",children:[e.jsxs("div",{className:"flex items-center",children:[e.jsx(Ze,{className:"h-3 w-3 mr-1"}),b[t.id].documentCount," docs"]}),e.jsxs("div",{className:"flex items-center",children:[e.jsx(de,{className:"h-3 w-3 mr-1"}),b[t.id].quizCount," quizzes"]})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs(m,{variant:"outline",size:"sm",className:"flex-1",onClick:()=>j(`/dashboard/documents?channel=${t.id}`),children:[e.jsx(Je,{className:"mr-2 h-4 w-4"}),"Documents"]}),e.jsxs(m,{variant:"outline",size:"sm",className:"flex-1",onClick:()=>{o(t),H(""),z(!0)},children:[e.jsx(fe,{className:"mr-2 h-4 w-4"}),"Settings"]})]}),t.settings.auto_generate_quizzes&&e.jsxs(m,{variant:"secondary",size:"sm",className:"w-full",onClick:()=>Le(t),disabled:S===t.id,children:[e.jsx(Xe,{className:"mr-2 h-4 w-4"}),S===t.id?"Generating...":"Generate Quiz Now"]}),t.telegram_channel_id&&e.jsxs("div",{className:"text-sm text-muted-foreground",children:[e.jsx(W,{className:"inline h-3 w-3 mr-1"}),t.telegram_channel_id]}),t.settings.auto_generate_quizzes&&e.jsxs("div",{className:"text-sm bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-3 py-2 rounded-md",children:[e.jsxs("div",{className:"flex items-center gap-1",children:[e.jsx(de,{className:"h-3 w-3"}),"Auto-generation enabled"]}),e.jsxs("div",{className:"text-xs mt-1 space-y-0.5",children:[t.settings.default_subject&&e.jsxs("div",{children:["Subject: ",t.settings.default_subject]}),e.jsxs("div",{children:["Frequency: ",t.settings.generation_frequency]}),e.jsxs("div",{children:["Questions: ",t.settings.questions_per_quiz]})]})]}),t.settings.auto_generate_quizzes&&!t.telegram_channel_id&&e.jsxs(R,{variant:"destructive",children:[e.jsx(ge,{className:"h-4 w-4"}),e.jsx(K,{className:"text-xs",children:"Missing Telegram channel ID"})]}),t.settings.auto_generate_quizzes&&!t.settings.system_prompt&&e.jsxs(R,{children:[e.jsx(ge,{className:"h-4 w-4"}),e.jsx(K,{className:"text-xs",children:"No system prompt configured. Add one in Settings for better quiz quality."})]})]})]},t.id))}),e.jsx(X,{open:D,onOpenChange:z,children:e.jsxs(ee,{className:"max-w-2xl max-h-[90vh] overflow-y-auto",children:[e.jsxs(te,{children:[e.jsxs(se,{children:["Edit Channel: ",s?.name]}),e.jsx(ae,{children:"Update channel details and configure auto quiz generation settings"})]}),s&&e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"space-y-4",children:[e.jsx("h3",{className:"font-medium",children:"Channel Information"}),e.jsxs("div",{className:"grid grid-cols-1 gap-4",children:[e.jsxs("div",{children:[e.jsx(g,{htmlFor:"edit-name",children:"Channel Name *"}),e.jsx(y,{id:"edit-name",value:s.name,onChange:t=>o({...s,name:t.target.value}),placeholder:"My Channel"})]}),e.jsxs("div",{children:[e.jsx(g,{htmlFor:"edit-description",children:"Description (Optional)"}),e.jsx(Z,{id:"edit-description",value:s.description||"",onChange:t=>o({...s,description:t.target.value}),placeholder:"Channel description..."})]})]})]}),e.jsx(R,{className:"bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900",children:e.jsxs("div",{className:"flex flex-col gap-1",children:[e.jsx("p",{className:"text-sm font-semibold text-blue-800 dark:text-blue-300",children:"Quick Setup Instructions:"}),e.jsxs("ol",{className:"text-xs text-blue-700 dark:text-blue-400 list-decimal ml-4 space-y-1",children:[e.jsxs("li",{children:["Add your bot to your channel as an ",e.jsx("strong",{children:"Administrator"}),"."]}),e.jsxs("li",{children:["Ensure it has ",e.jsx("strong",{children:'"Post Messages"'})," permission."]}),e.jsxs("li",{children:["Copy the Channel ID (e.g., ",e.jsx("code",{className:"bg-blue-100 dark:bg-blue-900 px-1 rounded",children:"-100..."}),")."]}),e.jsxs("li",{children:["Enter the token from ",e.jsx("code",{className:"bg-blue-100 dark:bg-blue-900 px-1 rounded",children:"@BotFather"})," below."]})]})]})}),e.jsxs("div",{className:"space-y-4",children:[e.jsx("h3",{className:"font-medium",children:"Telegram Configuration"}),e.jsxs("div",{className:"grid grid-cols-1 gap-4",children:[e.jsxs("div",{children:[e.jsx(g,{htmlFor:"edit-telegram-channel-id",children:"Telegram Chat ID"}),e.jsx(y,{id:"edit-telegram-channel-id",value:s.telegram_channel_id||"",onChange:t=>o({...s,telegram_channel_id:t.target.value}),placeholder:"@mychannel or -1001234567890"})]}),e.jsxs("div",{children:[e.jsx(g,{htmlFor:"edit-telegram-bot-token",children:"Telegram Bot Token"}),e.jsx(y,{id:"edit-telegram-bot-token",type:"password",value:s.telegram_bot_token||"",onChange:t=>o({...s,telegram_bot_token:t.target.value}),placeholder:"Enter bot token"})]}),s.telegram_channel_id&&e.jsxs(m,{type:"button",variant:"outline",size:"sm",onClick:Ge,disabled:E||!s.telegram_channel_id,children:[e.jsx(W,{className:"mr-2 h-4 w-4"}),E?"Testing...":"Test Connection"]})]})]}),e.jsxs("div",{className:"flex items-center justify-between p-4 bg-muted rounded-lg",children:[e.jsxs("div",{children:[e.jsx(g,{htmlFor:"auto-generate",className:"text-base font-medium",children:"Auto Generate Quizzes"}),e.jsx("p",{className:"text-sm text-muted-foreground",children:"Automatically generate and send quizzes based on this channel's knowledge base"})]}),e.jsx(Ke,{id:"auto-generate",checked:s.settings.auto_generate_quizzes,onCheckedChange:t=>o({...s,settings:{...s.settings,auto_generate_quizzes:t}})})]}),e.jsxs("div",{className:"space-y-4",children:[e.jsx("h3",{className:"font-medium",children:"Quiz Configuration"}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx(g,{htmlFor:"default-subject",children:"Subject/Topic"}),e.jsx(y,{id:"default-subject",value:s.settings.default_subject,onChange:t=>o({...s,settings:{...s.settings,default_subject:t.target.value}}),placeholder:"e.g., Mathematics, Science..."})]}),e.jsxs("div",{children:[e.jsx(g,{htmlFor:"questions-per-quiz",children:"Questions Per Quiz"}),e.jsx(y,{id:"questions-per-quiz",type:"number",min:"1",max:"50",value:s.settings.questions_per_quiz,onChange:t=>o({...s,settings:{...s.settings,questions_per_quiz:parseInt(t.target.value)||10}})})]})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx(g,{htmlFor:"default-language",children:"Language"}),e.jsxs(ue,{value:s.settings.default_language,onValueChange:t=>o({...s,settings:{...s.settings,default_language:t}}),children:[e.jsx(me,{children:e.jsx(he,{})}),e.jsxs(pe,{children:[e.jsx(_,{value:"bn",children:"Bengali"}),e.jsx(_,{value:"en",children:"English"}),e.jsx(_,{value:"hi",children:"Hindi"})]})]})]}),e.jsxs("div",{children:[e.jsx(g,{htmlFor:"generation-frequency",children:"Frequency"}),e.jsxs(ue,{value:s.settings.generation_frequency,onValueChange:t=>o({...s,settings:{...s.settings,generation_frequency:t}}),children:[e.jsx(me,{children:e.jsx(he,{})}),e.jsxs(pe,{children:[e.jsx(_,{value:"daily",children:"Daily"}),e.jsx(_,{value:"weekly",children:"Weekly"}),e.jsx(_,{value:"bi-weekly",children:"Bi-weekly"}),e.jsx(_,{value:"monthly",children:"Monthly"}),e.jsx(_,{value:"manual",children:"Manual only"})]})]})]})]})]}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("h3",{className:"font-medium",children:"AI System Prompt"}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(g,{htmlFor:"template-select",className:"text-sm",children:"Template:"}),e.jsxs(ue,{value:C,onValueChange:t=>Ne(t),children:[e.jsx(me,{className:"w-[180px]",children:e.jsx(he,{placeholder:"Choose template..."})}),e.jsx(pe,{children:k.map(t=>e.jsx(_,{value:t.id,children:t.name},t.id))})]}),e.jsxs(m,{variant:"outline",size:"sm",onClick:()=>U(!0),children:[e.jsx(fe,{className:"w-4 h-4 mr-1"}),"Manage"]})]})]}),e.jsxs(R,{children:[e.jsx(de,{className:"h-4 w-4"}),e.jsx(K,{children:"The system prompt tells the AI how to generate quiz questions for this specific channel. It ensures questions are created only from this channel's knowledge base and follow the appropriate format."})]}),e.jsx(Z,{id:"system-prompt",value:s.settings.system_prompt,onChange:t=>o({...s,settings:{...s.settings,system_prompt:t.target.value}}),placeholder:`Enter custom instructions for the AI quiz generator...

Example: Generate questions focused on practical applications and real-world examples. Include questions that test both recall and understanding. Make explanations educational and clear.`,rows:8,className:"font-mono text-sm"}),e.jsx("p",{className:"text-xs text-muted-foreground",children:"This prompt guides the AI when generating quizzes. It will use ONLY documents uploaded to this channel."})]}),b[s.id]&&e.jsxs("div",{className:"p-4 bg-muted rounded-lg",children:[e.jsx("h3",{className:"font-medium mb-2",children:"Channel Knowledge Base"}),e.jsxs("div",{className:"flex gap-6 text-sm",children:[e.jsxs("div",{children:[e.jsx("span",{className:"text-muted-foreground",children:"Documents:"})," ",e.jsx("span",{className:"font-medium",children:b[s.id].documentCount})]}),e.jsxs("div",{children:[e.jsx("span",{className:"text-muted-foreground",children:"Quizzes Generated:"})," ",e.jsx("span",{className:"font-medium",children:b[s.id].quizCount})]})]}),b[s.id].documentCount===0&&e.jsx("p",{className:"text-xs text-amber-600 mt-2",children:"No documents uploaded yet. Upload PDFs to build the knowledge base for better quiz generation."})]})]}),e.jsxs(xe,{children:[e.jsx(m,{variant:"outline",onClick:()=>z(!1),children:"Cancel"}),e.jsx(m,{onClick:()=>{s&&(Ye(s),z(!1))},children:"Save Changes"})]})]})}),e.jsx(Te,{open:Y,onOpenChange:L,children:e.jsxs(qe,{children:[e.jsxs(Se,{children:[e.jsx(Ie,{children:"Are you absolutely sure?"}),e.jsx(ke,{children:"This action cannot be undone. This will permanently delete the channel. Associated documents and quizzes will remain but will no longer be linked to this channel."})]}),e.jsxs(ze,{children:[e.jsx(Pe,{disabled:$,children:"Cancel"}),e.jsx(Ue,{onClick:t=>{t.preventDefault(),Me()},disabled:$,className:"bg-destructive text-destructive-foreground hover:bg-destructive/90",children:$?e.jsxs(e.Fragment,{children:[e.jsx(je,{className:"mr-2 h-4 w-4 animate-spin"}),"Deleting..."]}):"Delete Channel"})]})]})}),e.jsx(st,{open:M,onOpenChange:U,onTemplateSelect:t=>Ne(t)})]})})}export{bt as default};
