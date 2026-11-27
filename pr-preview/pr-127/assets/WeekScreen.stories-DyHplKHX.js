import{n as e,r as t}from"./rolldown-runtime-sJBDdmOt.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{b as r,y as i}from"./useLocalCopy-TAcccHRG.js";import{n as a,t as o}from"./WeekScreen-BsVOJMKL.js";var s=t({ActivitiesOffline:()=>z,ActivityOpen:()=>N,Default:()=>x,EarlierWeek:()=>w,EarlierWeekLoading:()=>E,EarlierWeekOffline:()=>D,EarlierWeekSignedOut:()=>j,Empty:()=>C,Loading:()=>T,NoSuggestion:()=>A,NoteOffline:()=>G,Offline:()=>O,RenameBlank:()=>R,RenameTooLong:()=>L,ReviewDone:()=>S,SignedOut:()=>k,TargetEditing:()=>U,TargetZeroRow:()=>W,TargetsOffline:()=>K,WithActivities:()=>M,WithTargets:()=>V,__namedExportsOrder:()=>q,default:()=>b}),c,l,u,d,f,p,m,h,g,_,v,y,b,x,S,C,w,T,E,D,O,k,A,j,M,N,P,F,I,L,R,z,B,V,H,U,W,G,K,q;function J(){return(J=e((()=>{r(),a(),c=n(),l=(e,t)=>({id:e,name:t,description:t,status:`active`}),u=[l(`deep`,`Deep`),l(`shallow`,`Shallow`),l(`maintenance`,`Maintenance`),l(`recovery`,`Recovery`),l(`waste`,`Waste`),{id:`admin`,name:`Admin`,description:`Forms, bills, paperwork`,status:`suggested`}],d=(e,t,n,r,i,a)=>({id:e,text:n,started_at:`2026-11-${t}T${r}:00Z`,ended_at:`2026-11-${t}T${i}:00Z`,created_at:`2026-11-${t}T${i}:00Z`,time_zone:`UTC`,category_id:a,tag_source:a?`ai`:null,suggested_category_id:null,tagging_gave_up_at:null}),f=[d(`e1`,`02`,`Wrote design doc`,`09:00`,`11:30`,`deep`),d(`e2`,`02`,`Email triage`,`11:30`,`12:15`,`shallow`),d(`e3`,`02`,`Lunch with Sam`,`12:30`,`13:30`,`recovery`),d(`e4`,`03`,`Reviewed PRs`,`09:00`,`10:30`,`deep`),d(`e5`,`03`,`Standup`,`10:30`,`10:45`,`shallow`),{...d(`e6`,`03`,`Tax form`,`11:00`,`11:20`,null),suggested_category_id:`admin`},{...d(`e9`,`03`,`Parking permit`,`15:00`,`15:20`,null),tagging_gave_up_at:`2026-11-03T16:00:00Z`},d(`e7`,`04`,`Commute`,`08:00`,`08:40`,`maintenance`),d(`e8`,`04`,`Scrolled reddit`,`13:00`,`13:20`,`waste`)],p=[{id:`ca`,name:`Company A`,status:`active`,merged_into_id:null},{id:`dn`,name:`Dinner`,status:`active`,merged_into_id:null},{id:`gm`,name:`Game A`,status:`active`,merged_into_id:null}],m=f.map(e=>({...e,activity_ids:[`e1`,`e2`,`e4`,`e5`].includes(e.id)?[`ca`]:e.id===`e3`?[`dn`]:e.id===`e8`?[`gm`]:[]})),h=async({canvasElement:e})=>{e.querySelector(`.act-row`)?.click()},g=e=>new Date(Date.parse(e)-6048e5).toISOString(),_=()=>Promise.resolve({ok:!0,data:null}),v=(e={ok:!0,data:null})=>()=>new Promise(t=>setTimeout(()=>t(e),600)),y={approveCategory:v(),rejectCategory:v(),renameActivity:v(),mergeActivity:v(),setTarget:v()},b={title:`Screens/2 Week`,component:o,args:{monday:`2026-11-02`,timeZone:`UTC`,now:Date.parse(`2026-11-04T14:05:00Z`),isCurrentWeek:!0,entries:f,categories:u,reviewDone:!1,refreshedAt:`2026-11-04T14:02:00Z`,onReviewDone:_,actions:y,moveCounts:{admin:1},fab:(0,c.jsx)(i,{onOpen:()=>{}})},parameters:{docs:{description:{component:`Time per Category and per day for a week, with Unlogged and Untagged as neutral grey rows. Entries are edited on the Day view. Read from the Local copy; earlier weeks are fetched.`}}}},x={},S={args:{reviewDone:!0}},C={name:`Empty week`,args:{entries:[]}},w={args:{monday:`2026-10-26`,isCurrentWeek:!1,reviewDone:void 0,entries:f.map(e=>({...e,id:`o${e.id}`,started_at:g(e.started_at),ended_at:g(e.ended_at)}))}},T={args:{load:`loading`,reviewDone:void 0,refreshedAt:null}},E={args:{monday:`2026-10-19`,isCurrentWeek:!1,reviewDone:void 0,load:`loading`}},D={args:{monday:`2026-10-19`,isCurrentWeek:!1,reviewDone:void 0,load:`offline-earlier-week`,connection:`offline`}},O={args:{connection:`offline`},parameters:{docs:{description:{story:`Tap "Mark review done" to see "Needs a connection."`}}}},k={args:{connection:`signed-out`}},A={name:`No Suggested category`,args:{categories:u.filter(e=>e.status===`active`)}},j={name:`Earlier week: signed out`,args:{monday:`2026-10-19`,isCurrentWeek:!1,reviewDone:void 0,load:`session-lost-earlier-week`,connection:`signed-out`}},M={name:`With Activities`,args:{entries:m,activities:p},parameters:{docs:{description:{story:`Tap a row for the Category split, Rename and Merge into…. Hidden while there are no Activities (Default).`}}}},N={name:`With Activities: row open`,args:{entries:m,activities:p},play:h},P=e=>({...y,renameActivity:()=>Promise.resolve({ok:!1,error:e})}),F=async({canvasElement:e})=>{await h({canvasElement:e}),[...e.querySelectorAll(`button`)].find(e=>e.textContent===`Rename`)?.click(),await new Promise(e=>setTimeout(e,50));let t=e.querySelector(`.act-manage input`);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,`value`).set.call(t,``),t.dispatchEvent(new Event(`input`,{bubbles:!0})),await new Promise(e=>setTimeout(e,100))},I=async({canvasElement:e})=>{await h({canvasElement:e});let t=t=>[...e.querySelectorAll(`button`)].find(e=>e.textContent===t)?.click();t(`Rename`),await new Promise(e=>setTimeout(e,50)),t(`Save`),await new Promise(e=>setTimeout(e,100))},L={name:`With Activities: rename refused, too long`,args:{entries:m,activities:p,actions:P(`activity_name_too_long`)},play:I},R={name:`With Activities: rename, blank name`,args:{entries:m,activities:p,actions:P(`activity_name_blank`)},play:F},z={name:`With Activities: offline`,args:{entries:m,activities:p,connection:`offline`},play:h},B=[{id:`t1`,activity_id:`ca`,category_id:null,minutes:360},{id:`t2`,activity_id:`ca`,category_id:`deep`,minutes:120},{id:`t3`,activity_id:`dn`,category_id:null,minutes:60},{id:`t4`,activity_id:`gm`,category_id:null,minutes:180}],V={name:`Targets: rows, 0h row, last week note`,args:{entries:m,activities:p,targets:B,lastNote:`Stop checking email before lunch`},play:h,parameters:{docs:{description:{story:`Company A and Dinner show actual / target (a tick once met); Game A has a target and no time (0h). Category lines of the open row show their own targets. The note from the last review is at the top.`}}}},H=(e,t)=>[...e.querySelectorAll(`button`)].find(e=>e.textContent===t)?.click(),U={name:`Targets: editing the any-Category target`,args:{entries:m,activities:p,targets:B},play:async({canvasElement:e})=>{await h({canvasElement:e}),H(e,`Target`),await new Promise(e=>setTimeout(e,50))}},W={name:`Targets: 0h row (target, no time this week)`,args:{entries:m,activities:[...p,{id:`rd`,name:`Reading`,status:`active`,merged_into_id:null}],targets:[...B,{id:`t5`,activity_id:`rd`,category_id:null,minutes:180}]}},G={name:`Review note: offline`,args:{connection:`offline`,lastNote:`Stop checking email before lunch`}},K={name:`Targets: offline`,args:{entries:m,activities:p,targets:B,connection:`offline`},play:h},q=[`Default`,`ReviewDone`,`Empty`,`EarlierWeek`,`Loading`,`EarlierWeekLoading`,`EarlierWeekOffline`,`Offline`,`SignedOut`,`NoSuggestion`,`EarlierWeekSignedOut`,`WithActivities`,`ActivityOpen`,`RenameTooLong`,`RenameBlank`,`ActivitiesOffline`,`WithTargets`,`TargetEditing`,`TargetZeroRow`,`NoteOffline`,`TargetsOffline`],x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    reviewDone: true
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  name: 'Empty week',
  args: {
    entries: []
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {
    monday: '2026-10-26',
    isCurrentWeek: false,
    reviewDone: undefined,
    entries: entries.map(e => ({
      ...e,
      id: \`o\${e.id}\`,
      started_at: weekEarlier(e.started_at),
      ended_at: weekEarlier(e.ended_at)
    }))
  }
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    load: 'loading',
    reviewDone: undefined,
    refreshedAt: null
  }
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  args: {
    monday: '2026-10-19',
    isCurrentWeek: false,
    reviewDone: undefined,
    load: 'loading'
  }
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    monday: '2026-10-19',
    isCurrentWeek: false,
    reviewDone: undefined,
    load: 'offline-earlier-week',
    connection: 'offline'
  }
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  args: {
    connection: 'offline'
  },
  parameters: {
    docs: {
      description: {
        story: 'Tap "Mark review done" to see "Needs a connection."'
      }
    }
  }
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    connection: 'signed-out'
  }
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  name: 'No Suggested category',
  args: {
    categories: categories.filter(c => c.status === 'active')
  }
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  name: 'Earlier week: signed out',
  args: {
    monday: '2026-10-19',
    isCurrentWeek: false,
    reviewDone: undefined,
    load: 'session-lost-earlier-week',
    connection: 'signed-out'
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  name: 'With Activities',
  args: {
    entries: withActivities,
    activities
  },
  parameters: {
    docs: {
      description: {
        story: 'Tap a row for the Category split, Rename and Merge into…. Hidden while there are no Activities (Default).'
      }
    }
  }
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  name: 'With Activities: row open',
  args: {
    entries: withActivities,
    activities
  },
  play: openFirstActivity
}`,...N.parameters?.docs?.source}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  name: 'With Activities: rename refused, too long',
  args: {
    entries: withActivities,
    activities,
    actions: renameFails('activity_name_too_long')
  },
  play: tryRename
}`,...L.parameters?.docs?.source}}},R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  name: 'With Activities: rename, blank name',
  args: {
    entries: withActivities,
    activities,
    actions: renameFails('activity_name_blank')
  },
  play: clearName
}`,...R.parameters?.docs?.source}}},z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`{
  name: 'With Activities: offline',
  args: {
    entries: withActivities,
    activities,
    connection: 'offline'
  },
  play: openFirstActivity
}`,...z.parameters?.docs?.source}}},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`{
  name: 'Targets: rows, 0h row, last week note',
  args: {
    entries: withActivities,
    activities,
    targets,
    lastNote: 'Stop checking email before lunch'
  },
  play: openFirstActivity,
  parameters: {
    docs: {
      description: {
        story: 'Company A and Dinner show actual / target (a tick once met); Game A has a target and no time (0h). Category lines of the open row show their own targets. The note from the last review is at the top.'
      }
    }
  }
}`,...V.parameters?.docs?.source}}},U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
  name: 'Targets: editing the any-Category target',
  args: {
    entries: withActivities,
    activities,
    targets
  },
  play: async ({
    canvasElement
  }) => {
    await openFirstActivity({
      canvasElement
    });
    tapText(canvasElement, 'Target');
    await new Promise(r => setTimeout(r, 50));
  }
}`,...U.parameters?.docs?.source}}},W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`{
  name: 'Targets: 0h row (target, no time this week)',
  args: {
    entries: withActivities,
    activities: [...activities, {
      id: 'rd',
      name: 'Reading',
      status: 'active',
      merged_into_id: null
    }],
    targets: [...targets, {
      id: 't5',
      activity_id: 'rd',
      category_id: null,
      minutes: 180
    }]
  }
}`,...W.parameters?.docs?.source}}},G.parameters={...G.parameters,docs:{...G.parameters?.docs,source:{originalSource:`{
  name: 'Review note: offline',
  args: {
    connection: 'offline',
    lastNote: 'Stop checking email before lunch'
  }
}`,...G.parameters?.docs?.source}}},K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`{
  name: 'Targets: offline',
  args: {
    entries: withActivities,
    activities,
    targets,
    connection: 'offline'
  },
  play: openFirstActivity
}`,...K.parameters?.docs?.source}}}})))()}export{J as n,s as t};