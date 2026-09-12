import{a as Re}from"./rolldown-runtime-DS2seoW7.js";import{E as Be,T as He}from"./vendor-query-BCDdmyzw.js";import{s as $e}from"./vendor-react-BL9Rsyj7.js";import{c as Ve,t as y}from"./input-B54d4k7e.js";import{t as u}from"./button-C-9OCAYb.js";import{_ as Z,b as ee,d as O,g as te,h as se,p as Je,t as Ne,v as xe,x as Ke,y as ae}from"./DashboardLayout-CxRH0C6G.js";import{t as we}from"./book-open-DlVT79vc.js";import{t as fe}from"./settings-BL88OpL6.js";import{t as Te}from"./pencil-Bd-IFnzA.js";import{n as je,t as oe}from"./sparkles-yOFkCodg.js";import{t as Ee}from"./trash-2-C9E5yP10.js";import{n as x}from"./client-C8_oZPXx.js";import{D as ce,M as We,N as w,O as de,P as Xe,S as _e,X as ve,_ as ue,c as X,d as Ze,g as T,h as me,j as Se,k as et,m as he,p as E,q as K,st as pe,v as ge,y as h}from"./index-reEvbzB_.js";import{a as qe,c as Ie,i as ke,n as De,o as ze,r as Ae,s as Pe,t as Oe}from"./alert-dialog-oCNgbzrS.js";import{t as tt}from"./scroll-area-Bg7puKsu.js";import{n as W,t as B}from"./alert-C39GykOg.js";var l=Re(Be(),1),k=[{id:"general",name:"General Knowledge",subject:"General",description:"Broad general knowledge quizzes covering various topics",prompt:`You are a quiz generator for general knowledge topics.

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
- [Note any special considerations]`}];function st(i){return k.find(c=>c.id===i)}function at(i,c,d,p){let j;p&&(j=k.find(o=>o.id===p)),j||(j=k.find(o=>o.subject.toLowerCase()===i.toLowerCase())||k[0]);const v={bn:`

LANGUAGE: Generate all content in Bengali (বাংলা). Use Bengali script and culturally relevant examples.`,en:`

LANGUAGE: Generate all content in English. Use clear, accessible language.`,hi:`

LANGUAGE: Generate all content in Hindi (हिन्दी). Use Hindi script and culturally relevant examples.`};let a=j.prompt;return a.includes("[YOUR SUBJECT]")&&(a=a.replace("[YOUR SUBJECT]",i||j.subject)),a+=v[c]||v.en,a+=`

CONTENT GUIDELINES:
- Don't generate Bangladesh related topics. If the topic is related to India, then generate the content.`,d&&(a+=`

ADDITIONAL INSTRUCTIONS:
${d}`),a}var H=class{static async getTemplates(i){const{data:c,error:d}=await x.from("user_templates").select("*").or(`user_id.eq.${i},is_default.eq.true`).order("is_default",{ascending:!1}).order("name",{ascending:!0});if(d)throw d;return c||[]}static async getTemplate(i){const{data:c,error:d}=await x.from("user_templates").select("*").eq("id",i).maybeSingle();if(d)throw d;return c}static async createTemplate(i,c){const{data:d,error:p}=await x.from("user_templates").insert({user_id:i,name:c.name,subject:c.subject,description:c.description||null,prompt:c.prompt,is_default:!1}).select().single();if(p)throw p;return d}static async updateTemplate(i,c){const{data:d,error:p}=await x.from("user_templates").update({...c,updated_at:new Date().toISOString()}).eq("id",i).select().single();if(p)throw p;return d}static async deleteTemplate(i){const{error:c}=await x.from("user_templates").delete().eq("id",i);if(c)throw c}static async isTemplateNameTaken(i,c,d){let p=x.from("user_templates").select("id").eq("user_id",i).eq("name",c);d&&(p=p.neq("id",d));const{data:j,error:v}=await p.maybeSingle();if(v)throw v;return!!j}static toSystemPromptFormat(i){return{id:i.id,name:i.name,subject:i.subject,description:i.description||"",prompt:i.prompt,isCustom:!i.is_default,userId:i.user_id}}},e=He();function nt({open:i,onOpenChange:c,onTemplateSelect:d}){const[p,j]=(0,l.useState)([]),[v,a]=(0,l.useState)(!1),[o,U]=(0,l.useState)(null),[D,C]=(0,l.useState)(!1),[ne,q]=(0,l.useState)(!1),[I,F]=(0,l.useState)(null),[z,_]=(0,l.useState)(!1),[S,M]=(0,l.useState)(!1),[m,N]=(0,l.useState)({name:"",subject:"",description:"",prompt:""});(0,l.useEffect)(()=>{i&&(G(),$())},[i]);const $=async()=>{try{const{data:{user:s}}=await x.auth.getUser();if(!s)return;const{data:r}=await x.from("profiles").select("role").eq("id",s.id).single();M(r?.role==="super_admin")}catch(s){console.error("Error checking admin status:",s)}},G=async()=>{a(!0);try{const{data:{user:s}}=await x.auth.getUser();if(!s)return;let r=await H.getTemplates(s.id);r.length===0&&(r=k.map(f=>({id:f.id,user_id:null,name:f.name,subject:f.subject,description:f.description,prompt:f.prompt,is_default:!0,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}))),j(r)}catch(s){console.error("Error loading templates:",s);const r=k.map(f=>({id:f.id,user_id:null,name:f.name,subject:f.subject,description:f.description,prompt:f.prompt,is_default:!0,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}));j(r)}finally{a(!1)}},A=s=>{s?(U(s),N({name:s.name,subject:s.subject,description:s.description||"",prompt:s.prompt})):(U(null),N({name:"",subject:"",description:"",prompt:`You are a quiz generator for [YOUR SUBJECT].

GUIDELINES:
- Create questions that accurately test knowledge of the subject
- Ensure all information is correct and relevant
- Include a variety of question types
- Make explanations helpful and educational
- Follow Government Competitive Exam Standard MCQs

QUESTION TYPES:
- [Define your question types]

IMPORTANT:
- [Add your specific requirements]`})),C(!0)},L=()=>{C(!1),U(null),N({name:"",subject:"",description:"",prompt:""})},Y=async()=>{if(!m.name.trim()||!m.subject.trim()||!m.prompt.trim()){w.error("Please fill in all required fields");return}_(!0);try{const{data:{user:s}}=await x.auth.getUser();if(!s)throw new Error("Not authenticated");if(await H.isTemplateNameTaken(s.id,m.name,o&&!o.is_default?o.id:void 0)){w.error("A template with this name already exists"),_(!1);return}o&&!o.is_default?(await H.updateTemplate(o.id,m),w.success("Template updated successfully")):(await H.createTemplate(s.id,m),w.success(o?.is_default?"Template saved as a new custom template":"Template created successfully")),L(),G()}catch(s){console.error("Error saving template:",s);const r=s.message||"Failed to save template";w.error(`Failed to save template: ${r}`),(r.includes('relation "user_templates" does not exist')||r.includes("Could not find the table")||s.code==="PGRST205")&&w.error("Database table missing. Please run the migration script in Supabase SQL Editor.",{duration:1e4})}finally{_(!1)}},V=async()=>{if(I){if(I.is_default&&!S){w.error("You cannot delete default templates."),q(!1);return}try{await H.deleteTemplate(I.id),w.success("Template deleted successfully"),q(!1),F(null),G()}catch(s){console.error("Error deleting template:",s);const r=s.message||"Failed to delete template";w.error(`Failed to delete template: ${r}`)}}},J=s=>{F(s),q(!0)},Q=s=>{d&&d(s.id),c(!1)};return(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(se,{open:i,onOpenChange:c,children:(0,e.jsxs)(te,{className:"max-w-3xl max-h-[80vh]",children:[(0,e.jsxs)(ae,{children:[(0,e.jsxs)(ee,{className:"flex items-center gap-2",children:[(0,e.jsx)(fe,{className:"w-5 h-5"}),"Manage Templates"]}),(0,e.jsx)(Z,{children:"Create and manage your quiz templates. All templates can be edited or deleted."})]}),(0,e.jsx)("div",{className:"flex justify-end mb-4",children:(0,e.jsxs)(u,{onClick:()=>A(),size:"sm",children:[(0,e.jsx)(je,{className:"w-4 h-4 mr-2"}),"New Template"]})}),v?(0,e.jsx)("div",{className:"flex items-center justify-center py-8",children:(0,e.jsx)(ve,{className:"w-6 h-6 animate-spin"})}):(0,e.jsx)(tt,{className:"h-[400px] pr-4",children:(0,e.jsxs)("div",{className:"space-y-3",children:[p.map(s=>(0,e.jsxs)("div",{className:"flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors",children:[(0,e.jsxs)("div",{className:"flex-1 min-w-0",children:[(0,e.jsxs)("div",{className:"flex items-center gap-2",children:[(0,e.jsx)("span",{className:"font-medium truncate",children:s.name}),s.is_default?(0,e.jsx)(_e,{variant:"secondary",className:"text-xs",children:"Default"}):(0,e.jsx)(_e,{variant:"outline",className:"text-xs",children:"Custom"})]}),(0,e.jsx)("p",{className:"text-sm text-muted-foreground truncate",children:s.description||s.subject})]}),(0,e.jsxs)("div",{className:"flex items-center gap-2 ml-4",children:[(0,e.jsx)(u,{variant:"outline",size:"sm",onClick:()=>Q(s),children:"Use"}),(S||!s.is_default)&&(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(u,{variant:"ghost",size:"icon",onClick:()=>A(s),children:(0,e.jsx)(Te,{className:"w-4 h-4"})}),(0,e.jsx)(u,{variant:"ghost",size:"icon",className:"text-destructive hover:text-destructive",onClick:()=>J(s),children:(0,e.jsx)(Ee,{className:"w-4 h-4"})})]}),!S&&s.is_default&&(0,e.jsx)(u,{variant:"ghost",size:"icon",onClick:()=>A(s),title:"Save as custom template",children:(0,e.jsx)(Te,{className:"w-4 h-4"})})]})]},s.id)),p.length===0&&(0,e.jsx)("div",{className:"text-center py-8 text-muted-foreground",children:"No templates found. Create your first custom template!"})]})})]})}),(0,e.jsx)(se,{open:D,onOpenChange:s=>!s&&L(),children:(0,e.jsxs)(te,{className:"max-w-2xl max-h-[90vh] overflow-y-auto",children:[(0,e.jsxs)(ae,{children:[(0,e.jsx)(ee,{children:o?"Edit Template":"Create New Template"}),(0,e.jsx)(Z,{children:o?"Update your custom template settings":"Create a new quiz template with custom guidelines"})]}),(0,e.jsxs)("div",{className:"space-y-4 py-4",children:[(0,e.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[(0,e.jsxs)("div",{className:"space-y-2",children:[(0,e.jsx)(h,{htmlFor:"name",children:"Template Name *"}),(0,e.jsx)(y,{id:"name",placeholder:"e.g., Indian History",value:m.name,onChange:s=>N({...m,name:s.target.value})})]}),(0,e.jsxs)("div",{className:"space-y-2",children:[(0,e.jsx)(h,{htmlFor:"subject",children:"Subject *"}),(0,e.jsx)(y,{id:"subject",placeholder:"e.g., History",value:m.subject,onChange:s=>N({...m,subject:s.target.value})})]})]}),(0,e.jsxs)("div",{className:"space-y-2",children:[(0,e.jsx)(h,{htmlFor:"description",children:"Description"}),(0,e.jsx)(y,{id:"description",placeholder:"Brief description of this template",value:m.description,onChange:s=>N({...m,description:s.target.value})})]}),(0,e.jsxs)("div",{className:"space-y-2",children:[(0,e.jsx)(h,{htmlFor:"prompt",children:"System Prompt *"}),(0,e.jsx)(X,{id:"prompt",placeholder:"Enter the AI system prompt for this template...",value:m.prompt,onChange:s=>N({...m,prompt:s.target.value}),className:"min-h-[200px] font-mono text-sm"}),(0,e.jsx)("p",{className:"text-xs text-muted-foreground",children:"This prompt guides the AI when generating quiz questions for this template."})]})]}),(0,e.jsxs)(xe,{children:[(0,e.jsx)(u,{variant:"outline",onClick:L,disabled:z,children:"Cancel"}),(0,e.jsxs)(u,{onClick:Y,disabled:z,children:[z&&(0,e.jsx)(ve,{className:"w-4 h-4 mr-2 animate-spin"}),o?"Update Template":"Create Template"]})]})]})}),(0,e.jsx)(Oe,{open:ne,onOpenChange:q,children:(0,e.jsxs)(ke,{children:[(0,e.jsxs)(Pe,{children:[(0,e.jsx)(Ie,{children:"Delete Template"}),(0,e.jsxs)(qe,{children:['Are you sure you want to delete "',I?.name,'"? This action cannot be undone.']})]}),(0,e.jsxs)(ze,{children:[(0,e.jsx)(Ae,{children:"Cancel"}),(0,e.jsx)(De,{onClick:V,className:"bg-destructive text-destructive-foreground",children:"Delete"})]})]})})]})}function bt(){const[i,c]=(0,l.useState)([]),[d,p]=(0,l.useState)(!0),[j,v]=(0,l.useState)(!1),[a,o]=(0,l.useState)(null),[U,D]=(0,l.useState)(!1),[C,ne]=(0,l.useState)({}),[q,I]=(0,l.useState)(null),[F,z]=(0,l.useState)(!1),[_,S]=(0,l.useState)(!1),[M,m]=(0,l.useState)(null),[N,$]=(0,l.useState)(""),[G,A]=(0,l.useState)(!1),[L,Y]=(0,l.useState)(!1),[V,J]=(0,l.useState)(null),[Q,s]=(0,l.useState)(!1),{toast:r}=Ve(),f=$e(),[g,R]=(0,l.useState)({name:"",description:"",telegram_channel_id:"",telegram_bot_token:""}),P=(0,l.useCallback)(async()=>{try{const{data:{user:t}}=await x.auth.getUser();if(!t)return;const n=await E.getUserChannels(t.id);c(n)}catch(t){const n=t instanceof Error?t.message:"Failed to load channels";r({title:"Error",description:n,variant:"destructive"})}finally{p(!1)}},[r]);(0,l.useEffect)(()=>{P()},[P]);const{canAccess:it,getLimit:Ue,isSuperAdmin:ye}=Je(),ie=Ue("max_telegram_channels")||1,Fe=async()=>{if(!g.name.trim()){r({title:"Validation Error",description:"Channel name is required",variant:"destructive"});return}if(!ye&&i.length>=ie){r({title:"Limit Reached",description:`Your current plan allows max ${ie} channel(s). Please upgrade for more.`,variant:"destructive"});return}z(!0);try{const{data:{user:t}}=await x.auth.getUser();if(!t)return;await E.createChannel(t.id,g),r({title:"Success",description:"Channel created successfully"}),v(!1),re(),P()}catch(t){r({title:"Error",description:t instanceof Error?t.message:"Failed to create channel",variant:"destructive"})}finally{z(!1)}},re=()=>{R({name:"",description:"",telegram_channel_id:"",telegram_bot_token:""}),m(null)},Me=async()=>{const t=g.telegram_channel_id.trim();if(!t){r({title:"Missing chat ID",description:"Please enter the Telegram channel/chat ID to test connection",variant:"destructive"});return}S(!0),m(null);try{const n=await E.testTelegramConnection(t,void 0);m(n),n.success?r({title:"Connection Successful",description:n.message}):r({title:"Connection Failed",description:n.message,variant:"destructive"})}catch(n){const b=n instanceof Error?n.message:"Test failed";m({success:!1,message:b}),r({title:"Error",description:b,variant:"destructive"})}finally{S(!1)}},Ge=async()=>{if(!a)return;const t=a.telegram_channel_id?.trim();if(!t){r({title:"Missing chat ID",description:"Please enter the Telegram channel/chat ID to test connection",variant:"destructive"});return}S(!0);try{const n=await E.testTelegramConnection(t,a.id);n.success?r({title:"Connection Successful",description:n.message}):r({title:"Connection Failed",description:n.message,variant:"destructive"})}catch(n){r({title:"Error",description:n instanceof Error?n.message:"Connection test failed",variant:"destructive"})}finally{S(!1)}},Le=async()=>{if(V){s(!0);try{const{data:{user:t}}=await x.auth.getUser();if(!t)return;await E.deleteChannel(V,t.id),r({title:"Success",description:"Channel deleted successfully"}),Y(!1),J(null),P()}catch(t){r({title:"Error",description:t instanceof Error?t.message:"Failed to delete channel",variant:"destructive"})}finally{s(!1)}}},Ye=async t=>{try{const{data:{user:n}}=await x.auth.getUser();if(!n)return;await E.updateChannel(t.id,n.id,{name:t.name.trim(),description:t.description?.trim()||"",telegram_channel_id:t.telegram_channel_id?.trim()||void 0,telegram_bot_token:t.telegram_bot_token?.trim()||void 0,settings:t.settings}),r({title:"Success",description:"Settings updated successfully"}),P()}catch(n){r({title:"Error",description:n instanceof Error?n.message:"Failed to update settings",variant:"destructive"})}},Ce=(0,l.useCallback)(async(t,n)=>{try{const b=await E.getChannelStats(t,n);ne(le=>({...le,[t]:{documentCount:b.documentCount,quizCount:b.quizCount}}))}catch{}},[]),Qe=async t=>{if(console.log("handleManualGeneration called for channel:",t.id,t.name),console.log("Channel settings:",t.settings),console.log("telegram_channel_id:",t.telegram_channel_id),!t.telegram_channel_id){r({title:"Error",description:"Please configure Telegram credentials first",variant:"destructive"});return}if(!t.settings.default_subject){console.log("No default_subject set for channel"),r({title:"Error",description:"Please set a default subject for quiz generation",variant:"destructive"});return}I(t.id);try{console.log("Calling ChannelService.triggerAutoGeneration...");const n=await E.triggerAutoGeneration(t.id,!0);if(console.log("triggerAutoGeneration result:",n),!n.success)throw new Error(n.message||"Failed to generate quiz");r({title:"Success",description:`Quiz generated and sent to ${t.name}`}),P()}catch(n){console.error("Quiz generation error:",n),r({title:"Error",description:n instanceof Error?n.message:"Failed to generate quiz. Please try again.",variant:"destructive"})}finally{I(null)}},be=t=>{if(!a||!t)return;const n=st(t);if(!n)return;const b=n.id!=="general"&&n.id!=="custom"?n.subject:a.settings.default_subject,le=at(b,a.settings.default_language,"",t);o({...a,settings:{...a.settings,system_prompt:le,default_subject:b}}),$(t),r({title:"Template Applied",description:`Applied "${n.name}" template. You can customize the prompt further.`})};return(0,l.useEffect)(()=>{const t=async()=>{const{data:{user:n}}=await x.auth.getUser();n&&await Promise.all(i.map(b=>Ce(b.id,n.id)))};i.length>0&&t()},[i,Ce]),d?(0,e.jsx)(Ne,{children:(0,e.jsxs)("div",{className:"container mx-auto p-6",children:[(0,e.jsxs)("div",{className:"flex justify-between items-center mb-6",children:[(0,e.jsxs)("div",{children:[(0,e.jsx)(O,{className:"h-8 w-32 mb-2"}),(0,e.jsx)(O,{className:"h-4 w-64"})]}),(0,e.jsx)(O,{className:"h-10 w-32"})]}),(0,e.jsx)("div",{className:"grid gap-6 md:grid-cols-2 lg:grid-cols-3",children:Array.from({length:3}).map((t,n)=>(0,e.jsxs)(ce,{children:[(0,e.jsxs)(Se,{children:[(0,e.jsx)(O,{className:"h-6 w-32 mb-2"}),(0,e.jsx)(O,{className:"h-4 w-48"})]}),(0,e.jsx)(de,{children:(0,e.jsx)(O,{className:"h-20 w-full"})})]},n))})]})}):(0,e.jsx)(Ne,{children:(0,e.jsxs)("div",{className:"container mx-auto p-6",children:[(0,e.jsxs)("div",{className:"flex justify-between items-center mb-6",children:[(0,e.jsxs)("div",{children:[(0,e.jsx)("h1",{className:"text-3xl font-bold",children:"Channels"}),(0,e.jsxs)("p",{className:"text-muted-foreground",children:["Manage your Telegram channels ",ye?`(${i.length} active)`:`(${i.length} / ${ie} used)`]})]}),(0,e.jsxs)(se,{open:j,onOpenChange:t=>{v(t),t||re()},children:[(0,e.jsx)(Ke,{asChild:!0,children:(0,e.jsxs)(u,{children:[(0,e.jsx)(je,{className:"mr-2 h-4 w-4"}),"Create Channel"]})}),(0,e.jsxs)(te,{children:[(0,e.jsxs)(ae,{children:[(0,e.jsx)(ee,{children:"Create New Channel"}),(0,e.jsx)(Z,{children:"Add a new Telegram channel with its own knowledge base"})]}),(0,e.jsxs)("div",{className:"space-y-4",children:[(0,e.jsxs)("div",{children:[(0,e.jsx)(h,{htmlFor:"name",children:"Channel Name *"}),(0,e.jsx)(y,{id:"name",value:g.name,onChange:t=>R({...g,name:t.target.value}),placeholder:"My Channel"}),!g.name.trim()&&g.name!==""&&(0,e.jsx)("p",{className:"text-xs text-destructive mt-1",children:"Channel name is required"})]}),(0,e.jsxs)("div",{children:[(0,e.jsx)(h,{htmlFor:"description",children:"Description (Optional)"}),(0,e.jsx)(X,{id:"description",value:g.description,onChange:t=>R({...g,description:t.target.value}),placeholder:"Channel description..."})]}),(0,e.jsxs)("div",{children:[(0,e.jsx)(h,{htmlFor:"telegram_channel_id",children:"Telegram Chat ID (Optional)"}),(0,e.jsx)(y,{id:"telegram_channel_id",value:g.telegram_channel_id,onChange:t=>R({...g,telegram_channel_id:t.target.value}),placeholder:"@mychannel or -1001234567890"})]}),(0,e.jsxs)("div",{children:[(0,e.jsx)(h,{htmlFor:"telegram_bot_token",children:"Telegram Bot Token (Optional)"}),(0,e.jsx)(y,{id:"telegram_bot_token",type:"password",value:g.telegram_bot_token,onChange:t=>R({...g,telegram_bot_token:t.target.value}),placeholder:"Enter bot token from @BotFather"}),(0,e.jsx)("p",{className:"text-xs text-muted-foreground mt-1",children:"Required to post to this channel. You can also set a global token in Settings."})]}),g.telegram_channel_id&&(0,e.jsxs)("div",{className:"space-y-2",children:[(0,e.jsxs)(u,{type:"button",variant:"outline",size:"sm",onClick:Me,disabled:_||!g.telegram_channel_id,className:"w-full",children:[(0,e.jsx)(K,{className:"mr-2 h-4 w-4"}),_?"Testing...":"Test Connection"]}),M&&(0,e.jsxs)(B,{variant:M.success?"default":"destructive",children:[(0,e.jsx)(pe,{className:"h-4 w-4"}),(0,e.jsx)(W,{className:"text-xs",children:M.message})]})]})]}),(0,e.jsxs)(xe,{children:[(0,e.jsx)(u,{variant:"outline",onClick:()=>{v(!1),re()},children:"Cancel"}),(0,e.jsx)(u,{onClick:Fe,disabled:!g.name.trim()||F,children:F?"Creating...":"Create"})]})]})]})]}),i.length===0?(0,e.jsx)(ce,{children:(0,e.jsxs)(de,{className:"flex flex-col items-center justify-center py-12",children:[(0,e.jsx)(K,{className:"h-12 w-12 text-muted-foreground mb-4"}),(0,e.jsx)("p",{className:"text-muted-foreground mb-4",children:"No channels yet"}),(0,e.jsxs)(u,{onClick:()=>v(!0),children:[(0,e.jsx)(je,{className:"mr-2 h-4 w-4"}),"Create Your First Channel"]})]})}):(0,e.jsx)("div",{className:"grid gap-6 md:grid-cols-2 lg:grid-cols-3",children:i.map(t=>(0,e.jsxs)(ce,{children:[(0,e.jsx)(Se,{children:(0,e.jsxs)("div",{className:"flex justify-between items-start",children:[(0,e.jsxs)("div",{children:[(0,e.jsx)(We,{children:t.name}),(0,e.jsx)(et,{children:t.description||"No description"})]}),(0,e.jsx)(u,{variant:"ghost",size:"sm",onClick:()=>{J(t.id),Y(!0)},className:"text-muted-foreground hover:text-destructive",children:(0,e.jsx)(Ee,{className:"h-4 w-4"})})]})}),(0,e.jsxs)(de,{className:"space-y-4",children:[C[t.id]&&(0,e.jsxs)("div",{className:"flex gap-4 text-xs text-muted-foreground",children:[(0,e.jsxs)("div",{className:"flex items-center",children:[(0,e.jsx)(we,{className:"h-3 w-3 mr-1"}),C[t.id].documentCount," topics"]}),(0,e.jsxs)("div",{className:"flex items-center",children:[(0,e.jsx)(oe,{className:"h-3 w-3 mr-1"}),C[t.id].quizCount," quizzes"]})]}),(0,e.jsxs)("div",{className:"flex gap-2",children:[(0,e.jsxs)(u,{variant:"outline",size:"sm",className:"flex-1",onClick:()=>f(`/dashboard/knowledge-base?channel=${t.id}`),children:[(0,e.jsx)(we,{className:"mr-2 h-4 w-4"}),"Knowledge Base"]}),(0,e.jsxs)(u,{variant:"outline",size:"sm",className:"flex-1",onClick:()=>{o(t),$(""),D(!0)},children:[(0,e.jsx)(fe,{className:"mr-2 h-4 w-4"}),"Settings"]})]}),t.settings.auto_generate_quizzes&&(0,e.jsxs)(u,{variant:"secondary",size:"sm",className:"w-full",onClick:()=>Qe(t),disabled:q===t.id,children:[(0,e.jsx)(Xe,{className:"mr-2 h-4 w-4"}),q===t.id?"Generating...":"Generate Quiz Now"]}),t.telegram_channel_id&&(0,e.jsxs)("div",{className:"text-sm text-muted-foreground",children:[(0,e.jsx)(K,{className:"inline h-3 w-3 mr-1"}),t.telegram_channel_id]}),t.settings.auto_generate_quizzes&&(0,e.jsxs)("div",{className:"text-sm bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-3 py-2 rounded-md",children:[(0,e.jsxs)("div",{className:"flex items-center gap-1",children:[(0,e.jsx)(oe,{className:"h-3 w-3"}),"Auto-generation enabled"]}),(0,e.jsxs)("div",{className:"text-xs mt-1 space-y-0.5",children:[t.settings.default_subject&&(0,e.jsxs)("div",{children:["Subject: ",t.settings.default_subject]}),(0,e.jsxs)("div",{children:["Frequency: ",t.settings.generation_frequency]}),(0,e.jsxs)("div",{children:["Questions: ",t.settings.questions_per_quiz]})]})]}),t.settings.auto_generate_quizzes&&!t.telegram_channel_id&&(0,e.jsxs)(B,{variant:"destructive",children:[(0,e.jsx)(pe,{className:"h-4 w-4"}),(0,e.jsx)(W,{className:"text-xs",children:"Missing Telegram channel ID"})]}),t.settings.auto_generate_quizzes&&!t.settings.system_prompt&&(0,e.jsxs)(B,{children:[(0,e.jsx)(pe,{className:"h-4 w-4"}),(0,e.jsx)(W,{className:"text-xs",children:"No system prompt configured. Add one in Settings for better quiz quality."})]})]})]},t.id))}),(0,e.jsx)(se,{open:U,onOpenChange:D,children:(0,e.jsxs)(te,{className:"max-w-2xl max-h-[90vh] overflow-y-auto",children:[(0,e.jsxs)(ae,{children:[(0,e.jsxs)(ee,{children:["Edit Channel: ",a?.name]}),(0,e.jsx)(Z,{children:"Update channel details and configure auto quiz generation settings"})]}),a&&(0,e.jsxs)("div",{className:"space-y-6",children:[(0,e.jsxs)("div",{className:"space-y-4",children:[(0,e.jsx)("h3",{className:"font-medium",children:"Channel Information"}),(0,e.jsxs)("div",{className:"grid grid-cols-1 gap-4",children:[(0,e.jsxs)("div",{children:[(0,e.jsx)(h,{htmlFor:"edit-name",children:"Channel Name *"}),(0,e.jsx)(y,{id:"edit-name",value:a.name,onChange:t=>o({...a,name:t.target.value}),placeholder:"My Channel"})]}),(0,e.jsxs)("div",{children:[(0,e.jsx)(h,{htmlFor:"edit-description",children:"Description (Optional)"}),(0,e.jsx)(X,{id:"edit-description",value:a.description||"",onChange:t=>o({...a,description:t.target.value}),placeholder:"Channel description..."})]})]})]}),(0,e.jsx)(B,{className:"bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900",children:(0,e.jsxs)("div",{className:"flex flex-col gap-1",children:[(0,e.jsx)("p",{className:"text-sm font-semibold text-blue-800 dark:text-blue-300",children:"Quick Setup Instructions:"}),(0,e.jsxs)("ol",{className:"text-xs text-blue-700 dark:text-blue-400 list-decimal ml-4 space-y-1",children:[(0,e.jsxs)("li",{children:["Add your bot to your channel as an ",(0,e.jsx)("strong",{children:"Administrator"}),"."]}),(0,e.jsxs)("li",{children:["Ensure it has ",(0,e.jsx)("strong",{children:'"Post Messages"'})," permission."]}),(0,e.jsxs)("li",{children:["Copy the Channel ID (e.g., ",(0,e.jsx)("code",{className:"bg-blue-100 dark:bg-blue-900 px-1 rounded",children:"-100..."}),")."]}),(0,e.jsxs)("li",{children:["Enter the token from ",(0,e.jsx)("code",{className:"bg-blue-100 dark:bg-blue-900 px-1 rounded",children:"@BotFather"})," below."]})]})]})}),(0,e.jsxs)("div",{className:"space-y-4",children:[(0,e.jsx)("h3",{className:"font-medium",children:"Telegram Configuration"}),(0,e.jsxs)("div",{className:"grid grid-cols-1 gap-4",children:[(0,e.jsxs)("div",{children:[(0,e.jsx)(h,{htmlFor:"edit-telegram-channel-id",children:"Telegram Chat ID"}),(0,e.jsx)(y,{id:"edit-telegram-channel-id",value:a.telegram_channel_id||"",onChange:t=>o({...a,telegram_channel_id:t.target.value}),placeholder:"@mychannel or -1001234567890"})]}),(0,e.jsxs)("div",{children:[(0,e.jsx)(h,{htmlFor:"edit-telegram-bot-token",children:"Telegram Bot Token"}),(0,e.jsx)(y,{id:"edit-telegram-bot-token",type:"password",value:a.telegram_bot_token||"",onChange:t=>o({...a,telegram_bot_token:t.target.value}),placeholder:"Enter bot token"})]}),a.telegram_channel_id&&(0,e.jsxs)(u,{type:"button",variant:"outline",size:"sm",onClick:Ge,disabled:_||!a.telegram_channel_id,children:[(0,e.jsx)(K,{className:"mr-2 h-4 w-4"}),_?"Testing...":"Test Connection"]})]})]}),(0,e.jsxs)("div",{className:"flex items-center justify-between p-4 bg-muted rounded-lg",children:[(0,e.jsxs)("div",{children:[(0,e.jsx)(h,{htmlFor:"auto-generate",className:"text-base font-medium",children:"Auto Generate Quizzes"}),(0,e.jsx)("p",{className:"text-sm text-muted-foreground",children:"Automatically generate and send quizzes based on this channel's knowledge base"})]}),(0,e.jsx)(Ze,{id:"auto-generate",checked:a.settings.auto_generate_quizzes,onCheckedChange:t=>o({...a,settings:{...a.settings,auto_generate_quizzes:t}})})]}),(0,e.jsxs)("div",{className:"space-y-4",children:[(0,e.jsx)("h3",{className:"font-medium",children:"Quiz Configuration"}),(0,e.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[(0,e.jsxs)("div",{children:[(0,e.jsx)(h,{htmlFor:"default-subject",children:"Subject/Topic"}),(0,e.jsx)(y,{id:"default-subject",value:a.settings.default_subject,onChange:t=>o({...a,settings:{...a.settings,default_subject:t.target.value}}),placeholder:"e.g., Mathematics, Science..."})]}),(0,e.jsxs)("div",{children:[(0,e.jsx)(h,{htmlFor:"questions-per-quiz",children:"Questions Per Quiz"}),(0,e.jsx)(y,{id:"questions-per-quiz",type:"number",min:"1",max:"50",value:a.settings.questions_per_quiz,onChange:t=>o({...a,settings:{...a.settings,questions_per_quiz:parseInt(t.target.value)||10}})})]})]}),(0,e.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[(0,e.jsxs)("div",{children:[(0,e.jsx)(h,{htmlFor:"default-language",children:"Language"}),(0,e.jsxs)(he,{value:a.settings.default_language,onValueChange:t=>o({...a,settings:{...a.settings,default_language:t}}),children:[(0,e.jsx)(ue,{children:(0,e.jsx)(ge,{})}),(0,e.jsxs)(me,{children:[(0,e.jsx)(T,{value:"bn",children:"Bengali"}),(0,e.jsx)(T,{value:"en",children:"English"}),(0,e.jsx)(T,{value:"hi",children:"Hindi"})]})]})]}),(0,e.jsxs)("div",{children:[(0,e.jsx)(h,{htmlFor:"generation-frequency",children:"Frequency"}),(0,e.jsxs)(he,{value:a.settings.generation_frequency,onValueChange:t=>o({...a,settings:{...a.settings,generation_frequency:t}}),children:[(0,e.jsx)(ue,{children:(0,e.jsx)(ge,{})}),(0,e.jsxs)(me,{children:[(0,e.jsx)(T,{value:"daily",children:"Daily"}),(0,e.jsx)(T,{value:"weekly",children:"Weekly"}),(0,e.jsx)(T,{value:"bi-weekly",children:"Bi-weekly"}),(0,e.jsx)(T,{value:"monthly",children:"Monthly"}),(0,e.jsx)(T,{value:"manual",children:"Manual only"})]})]})]})]})]}),(0,e.jsxs)("div",{className:"space-y-4",children:[(0,e.jsxs)("div",{className:"flex items-center justify-between",children:[(0,e.jsx)("h3",{className:"font-medium",children:"AI System Prompt"}),(0,e.jsxs)("div",{className:"flex items-center gap-2",children:[(0,e.jsx)(h,{htmlFor:"template-select",className:"text-sm",children:"Template:"}),(0,e.jsxs)(he,{value:N,onValueChange:t=>be(t),children:[(0,e.jsx)(ue,{className:"w-[180px]",children:(0,e.jsx)(ge,{placeholder:"Choose template..."})}),(0,e.jsx)(me,{children:k.map(t=>(0,e.jsx)(T,{value:t.id,children:t.name},t.id))})]}),(0,e.jsxs)(u,{variant:"outline",size:"sm",onClick:()=>A(!0),children:[(0,e.jsx)(fe,{className:"w-4 h-4 mr-1"}),"Manage"]})]})]}),(0,e.jsxs)(B,{children:[(0,e.jsx)(oe,{className:"h-4 w-4"}),(0,e.jsx)(W,{children:"The system prompt tells the AI how to generate quiz questions for this specific channel. It ensures questions are created only from this channel's knowledge base and follow the appropriate format."})]}),(0,e.jsx)(X,{id:"system-prompt",value:a.settings.system_prompt,onChange:t=>o({...a,settings:{...a.settings,system_prompt:t.target.value}}),placeholder:`Enter custom instructions for the AI quiz generator...

Example: Generate questions focused on practical applications and real-world examples. Include questions that test both recall and understanding. Make explanations educational and clear.`,rows:8,className:"font-mono text-sm"}),(0,e.jsx)("p",{className:"text-xs text-muted-foreground",children:"This prompt guides the AI when generating quizzes. It will use ONLY documents uploaded to this channel."})]}),C[a.id]&&(0,e.jsxs)("div",{className:"p-4 bg-muted rounded-lg",children:[(0,e.jsx)("h3",{className:"font-medium mb-2",children:"Channel Knowledge Base"}),(0,e.jsxs)("div",{className:"flex gap-6 text-sm",children:[(0,e.jsxs)("div",{children:[(0,e.jsx)("span",{className:"text-muted-foreground",children:"Topics:"})," ",(0,e.jsx)("span",{className:"font-medium",children:C[a.id].documentCount})]}),(0,e.jsxs)("div",{children:[(0,e.jsx)("span",{className:"text-muted-foreground",children:"Quizzes Generated:"})," ",(0,e.jsx)("span",{className:"font-medium",children:C[a.id].quizCount})]})]}),C[a.id].documentCount===0&&(0,e.jsx)("p",{className:"text-xs text-amber-600 mt-2",children:"No topics saved yet. Add topics to the knowledge base for better quiz generation."})]})]}),(0,e.jsxs)(xe,{children:[(0,e.jsx)(u,{variant:"outline",onClick:()=>D(!1),children:"Cancel"}),(0,e.jsx)(u,{onClick:()=>{a&&(Ye(a),D(!1))},children:"Save Changes"})]})]})}),(0,e.jsx)(Oe,{open:L,onOpenChange:Y,children:(0,e.jsxs)(ke,{children:[(0,e.jsxs)(Pe,{children:[(0,e.jsx)(Ie,{children:"Are you absolutely sure?"}),(0,e.jsx)(qe,{children:"This action cannot be undone. This will permanently delete the channel. Associated documents and quizzes will remain but will no longer be linked to this channel."})]}),(0,e.jsxs)(ze,{children:[(0,e.jsx)(Ae,{disabled:Q,children:"Cancel"}),(0,e.jsx)(De,{onClick:t=>{t.preventDefault(),Le()},disabled:Q,className:"bg-destructive text-destructive-foreground hover:bg-destructive/90",children:Q?(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(ve,{className:"mr-2 h-4 w-4 animate-spin"}),"Deleting..."]}):"Delete Channel"})]})]})}),(0,e.jsx)(nt,{open:G,onOpenChange:A,onTemplateSelect:t=>be(t)})]})})}export{bt as default};
