import{n as e,r as t}from"./rolldown-runtime-sJBDdmOt.js";import{t as n}from"./react-DlPsW1c0.js";import{t as r}from"./jsx-runtime-MKhVqBIO.js";import{c as i,n as a,o,r as s,t as c,u as l}from"./Phone-DtNOfnUA.js";import{A as u,B as d,C as f,D as p,E as m,F as h,H as ee,I as g,L as te,M as _,N as ne,O as re,P as ie,R as v,T as y,U as ae,V as oe,W as se,b as ce,i as b,j as x,k as S,m as le,p as ue,t as C,w,x as T,y as de,z as fe}from"./useLocalCopy-D0cCeNGF.js";import{a as E,i as pe,t as D}from"./useWeekEntries-CTWMUBU_.js";function me({value:e,activities:t,onChange:n,onDraft:r,disabled:i,error:a}){let o=(0,O.useId)(),[s,c]=(0,O.useState)(!1),[l,u]=(0,O.useState)(``),d=new Set(e.map(e=>e.toLowerCase())),f=t.filter(e=>e.status===`active`&&!d.has(e.name.toLowerCase())).sort((e,t)=>e.name.localeCompare(t.name)),p=e.length>=3,m=t=>{n(j([...e,t]).slice(0,3)),u(``),r?.(``),c(!1)};return(0,k.jsxs)(`div`,{className:`activity-picker`,role:`group`,"aria-label":`Activities`,children:[(0,k.jsxs)(`span`,{className:`field-label`,children:[`Activities (up to `,3,`)`]}),(0,k.jsxs)(`div`,{className:`chips`,children:[e.map(t=>(0,k.jsxs)(`button`,{type:`button`,className:`chip selected`,disabled:i,"aria-label":`Remove ${t}`,onClick:()=>n(e.filter(e=>e!==t)),children:[t,` ×`]},t)),!p&&!s&&(0,k.jsx)(`button`,{type:`button`,className:`chip add`,disabled:i,onClick:()=>c(!0),children:`+ Add`})]}),s&&!p&&(0,k.jsxs)(`div`,{className:`activity-add`,children:[(0,k.jsx)(`label`,{className:`field-label`,htmlFor:o,children:`Activity name`}),(0,k.jsx)(`input`,{id:o,className:`text`,autoFocus:!0,value:l,readOnly:i,maxLength:60,onChange:e=>{u(e.target.value),r?.(e.target.value)},onKeyDown:e=>{e.key===`Enter`&&A(l)&&(e.preventDefault(),m(l))}}),(0,k.jsx)(`div`,{className:`chips`,role:`group`,"aria-label":`Pick an Activity`,children:f.map(e=>(0,k.jsx)(`button`,{type:`button`,className:`chip`,disabled:i,onClick:()=>m(e.name),children:e.name},e.id))}),(0,k.jsxs)(`div`,{className:`row-actions`,children:[(0,k.jsx)(`button`,{type:`button`,className:`secondary`,disabled:i||!A(l),onClick:()=>m(l),children:`Add`}),(0,k.jsx)(`button`,{type:`button`,className:`link`,disabled:i,onClick:()=>{c(!1),u(``),r?.(``)},children:`Cancel`})]})]}),a&&(0,k.jsx)(`p`,{className:`error`,role:`alert`,children:a})]})}var O,k,A,j;function M(){return(M=e((()=>{O=n(),k=r(),A=e=>e.trim().replace(/\s+/g,` `),j=e=>{let t=new Set;return e.map(A).filter(e=>e&&!t.has(e.toLowerCase())&&t.add(e.toLowerCase()))},me.__docgenInfo={description:`Change an Entry's Activities: remove one with ×, add up to 3 by picking an Active one or typing a new name (#79).
The value is the list of names; the parent saves it with the Entry.`,methods:[],displayName:`ActivityPicker`,props:{value:{required:!0,tsType:{name:`unknown`},description:``},activities:{required:!0,tsType:{name:`unknown`},description:``},onChange:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(names: string[]) => void`,signature:{arguments:[{type:{name:`Array`,elements:[{name:`string`}],raw:`string[]`},name:`names`}],return:{name:`void`}}},description:``},disabled:{required:!1,tsType:{name:`boolean`},description:``},onDraft:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(draft: string) => void`,signature:{arguments:[{type:{name:`string`},name:`draft`}],return:{name:`void`}}},description:`Called with the name being typed, '' once it is added or cancelled, so the parent can save it too.`},error:{required:!1,tsType:{name:`string`},description:`A message about a name, shown right under the field.`}}}})))()}function he({entry:e,siblings:t,now:n,timeZone:r,online:i,activities:a=[],activityNames:o=[],onSave:s,onSetActivities:c,onDelete:l,onClose:u}){let d=r,[f,m]=(0,N.useState)(e.text),[h,ee]=(0,N.useState)(Date.parse(e.started_at)),[g,te]=(0,N.useState)(Date.parse(e.ended_at)),[ne,v]=(0,N.useState)(()=>[...o]),[y,ae]=(0,N.useState)(null),[oe,se]=(0,N.useState)(),[ce,b]=(0,N.useState)(``),[x,S]=(0,N.useState)(),[le,ue]=(0,N.useState)(!1),C=g>n+F?I.entry_end_in_future:h>=g?I.entry_end_not_after_start:void 0,T=f.trim()?void 0:I.entry_text_empty,de=(0,N.useMemo)(()=>h<g?ie(t,h,g,e.id)[0]:void 0,[t,h,g,e.id]),fe=de&&`${de.text} ${w(Date.parse(de.started_at),d)}–${w(Date.parse(de.ended_at),d)}`,E=e=>e===`unknown`?`Needs a connection.`:e in I?I[e]:`Couldn't save. Try again.`,pe=async(e,t)=>{ae(e),se(void 0),S(void 0);let n=await t();ae(null),n.ok?u():n.error===`activity_name_blank`||n.error===`activity_name_too_long`?S(E(n.error)):n.error!==`session_lost`&&n.error!==`entry_not_found`&&se(E(n.error))},D=e=>j(e).map(e=>e.toLowerCase()).join(`|`),O=j([...ne,ce]).slice(0,3),k=!!c&&D(O)!==D(o),A=()=>pe(`saving`,async()=>{let e=await s({text:f.trim(),started_at:new Date(h).toISOString(),ended_at:new Date(g).toISOString(),time_zone:d});return!e.ok||!k?e:c(O)}),M=y!==null;return(0,P.jsxs)(`div`,{className:`entry-edit`,role:`group`,"aria-label":`Edit ${e.text}`,children:[(0,P.jsx)(`label`,{className:`field-label`,htmlFor:`edit-text-${e.id}`,children:`What I did`}),(0,P.jsx)(`input`,{id:`edit-text-${e.id}`,className:`text`,autoFocus:!0,value:f,readOnly:M,"aria-invalid":!!T,"aria-describedby":T?`edit-text-error-${e.id}`:void 0,onChange:e=>m(e.target.value),onKeyDown:e=>e.key===`Enter`&&!T&&!C&&i&&!M&&void A()}),T&&(0,P.jsx)(`p`,{id:`edit-text-error-${e.id}`,className:`error`,role:`alert`,children:T}),c&&(0,P.jsx)(me,{value:ne,activities:a,disabled:M,error:x,onDraft:b,onChange:e=>{v(e),S(void 0)}}),(0,P.jsxs)(`div`,{className:`times`,children:[(0,P.jsx)(re,{label:`From`,value:w(h,d),disabled:M,invalid:!!C&&h>=g,describedBy:`edit-time-error-${e.id}`,onChange:e=>ee(p(h,e,d))}),(0,P.jsx)(re,{label:`To`,value:w(g,d),disabled:M,invalid:!!C,describedBy:`edit-time-error-${e.id}`,onChange:e=>te(p(g,e,d))})]}),C&&(0,P.jsx)(`p`,{id:`edit-time-error-${e.id}`,className:`error`,role:`alert`,children:C}),(0,P.jsx)(_,{with:fe}),!i&&(0,P.jsx)(`p`,{className:`note`,children:`Saving needs a connection.`}),oe&&(0,P.jsx)(`p`,{className:`error`,role:`alert`,children:oe}),(0,P.jsxs)(`div`,{className:`row-actions`,children:[(0,P.jsx)(`button`,{className:`primary small`,onClick:()=>void A(),disabled:M||!!T||!!C||!i,children:y===`saving`?`Saving…`:`Save`}),(0,P.jsx)(`button`,{className:`secondary`,onClick:u,disabled:M,children:`Cancel`}),le?(0,P.jsxs)(`span`,{children:[`Delete?`,` `,(0,P.jsx)(`button`,{className:`link danger`,onClick:()=>void pe(`deleting`,l),disabled:M||!i,children:`Yes`}),` `,(0,P.jsx)(`button`,{className:`link`,onClick:()=>ue(!1),disabled:M,children:`No`})]}):(0,P.jsx)(`button`,{className:`link danger`,onClick:()=>ue(!0),disabled:M||!i,children:`Delete`})]})]})}var N,P,F,I;function ge(){return(ge=e((()=>{N=n(),h(),M(),ne(),S(),y(),P=r(),F=6e4,I={entry_text_empty:`Write what you did.`,entry_end_not_after_start:`From must be before To.`,entry_end_in_future:`To can't be later than now.`,time_zone_unknown:`Couldn't save. Try again.`,activity_name_blank:`Write an Activity name.`,activity_name_too_long:`Use 60 characters or fewer.`},he.__docgenInfo={description:`Inline editor: the row expands in place, one at a time (AC-1.3). Save and Delete need a connection (D3).
The AC-1.2 checks apply; an overlap only warns. No form-open time is sent for an edit.
Changing the text re-tags the Entry unless its Tag source is me (the Server clears the Tag).`,methods:[],displayName:`EntryEditor`,props:{entry:{required:!0,tsType:{name:`intersection`,raw:`Pick<
  Tables['entries']['Row'],
  | 'id'
  | 'text'
  | 'started_at'
  | 'ended_at'
  | 'time_zone'
  | 'category_id'
  | 'tag_source'
  | 'suggested_category_id'
  | 'tagging_gave_up_at'
  | 'created_at'
> &
  // Optional until the UI fixtures and \`useLocalCopy\` carry them (they live in app/src/ui); a refresh always stores them.
  Partial<Pick<Tables['entries']['Row'], 'activity_source'>> & {
    /** The Entry's Activities (0 to 3), oldest first */
    activity_ids?: string[];
  }`,elements:[{name:`Pick`,elements:[{name:`signature['Tables']['entries']['Row']`,raw:`Tables['entries']['Row']`},{name:`union`,raw:`| 'id'
| 'text'
| 'started_at'
| 'ended_at'
| 'time_zone'
| 'category_id'
| 'tag_source'
| 'suggested_category_id'
| 'tagging_gave_up_at'
| 'created_at'`,elements:[{name:`literal`,value:`'id'`},{name:`literal`,value:`'text'`},{name:`literal`,value:`'started_at'`},{name:`literal`,value:`'ended_at'`},{name:`literal`,value:`'time_zone'`},{name:`literal`,value:`'category_id'`},{name:`literal`,value:`'tag_source'`},{name:`literal`,value:`'suggested_category_id'`},{name:`literal`,value:`'tagging_gave_up_at'`},{name:`literal`,value:`'created_at'`}]}],raw:`Pick<
  Tables['entries']['Row'],
  | 'id'
  | 'text'
  | 'started_at'
  | 'ended_at'
  | 'time_zone'
  | 'category_id'
  | 'tag_source'
  | 'suggested_category_id'
  | 'tagging_gave_up_at'
  | 'created_at'
>`},{name:`Partial`,elements:[{name:`Pick`,elements:[{name:`signature['Tables']['entries']['Row']`,raw:`Tables['entries']['Row']`},{name:`literal`,value:`'activity_source'`}],raw:`Pick<Tables['entries']['Row'], 'activity_source'>`}],raw:`Partial<Pick<Tables['entries']['Row'], 'activity_source'>>`},{name:`signature`,type:`object`,raw:`{
  /** The Entry's Activities (0 to 3), oldest first */
  activity_ids?: string[];
}`,signature:{properties:[{key:`activity_ids`,value:{name:`Array`,elements:[{name:`string`}],raw:`string[]`,required:!1},description:`The Entry's Activities (0 to 3), oldest first`}]}}]},description:``},siblings:{required:!0,tsType:{name:`unknown`},description:`Other Entries of the week, for the overlap warning.`},now:{required:!0,tsType:{name:`number`},description:``},timeZone:{required:!0,tsType:{name:`string`},description:`The device zone, as the row shows it, so the row and its editor agree after a zone change.`},online:{required:!0,tsType:{name:`boolean`},description:``},activities:{required:!1,tsType:{name:`unknown`},description:"All of mine; the picker offers the Active ones. Without `onSetActivities` there is no picker.",defaultValue:{value:`[]`,computed:!1}},activityNames:{required:!1,tsType:{name:`unknown`},description:`The Entry's current Activity names (0 to 3), oldest first.`,defaultValue:{value:`[]`,computed:!1}},onSave:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(fields: EntryFields) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`Pick`,elements:[{name:`signature['Tables']['entries']['Row']`,raw:`Tables['entries']['Row']`},{name:`union`,raw:`'text' | 'started_at' | 'ended_at' | 'time_zone'`,elements:[{name:`literal`,value:`'text'`},{name:`literal`,value:`'started_at'`},{name:`literal`,value:`'ended_at'`},{name:`literal`,value:`'time_zone'`}]}],raw:`Pick<Tables['entries']['Row'], 'text' | 'started_at' | 'ended_at' | 'time_zone'>`},name:`fields`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}}},description:``},onSetActivities:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(names: string[]) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`Array`,elements:[{name:`string`}],raw:`string[]`},name:`names`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}}},description:`Called after the fields are saved, and only when the list changed; empty = none.`},onDelete:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => Promise<Result<unknown>>`,signature:{arguments:[],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}}},description:``},onClose:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:`Called after a confirmed save or delete, and on Cancel.`}}}})))()}function _e({entry:e,category:t,activities:n=[],timeZone:r,onEdit:i,onTag:a}){let o=w(Date.parse(e.started_at),r),s=w(Date.parse(e.ended_at),r),c=n.map(e=>e.name).join(` · `);return(0,L.jsxs)(`div`,{className:`entry`,children:[(0,L.jsxs)(`button`,{className:`what`,onClick:i,"aria-label":`Edit ${e.text}, ${o}–${s}${c?`, ${c}`:``}`,children:[(0,L.jsx)(`span`,{className:`text`,children:e.text}),` `,(0,L.jsxs)(`span`,{className:`when`,children:[o,`–`,s]}),c&&(0,L.jsxs)(L.Fragment,{children:[` `,(0,L.jsx)(`span`,{className:`act`,children:c})]})]}),(0,L.jsxs)(`button`,{className:t?`tag`:`tag neutral`,style:t?{background:T(t.name)}:void 0,onClick:e=>a(e.currentTarget),"aria-label":`Category: ${t?.name??`Untagged`}. Change`,children:[t?.name??`Untagged`,` ▾`]}),!t&&e.tagging_gave_up_at&&(0,L.jsx)(`span`,{className:`gaveup`,children:`Couldn't tag this one. Pick a category.`})]})}var L;function ve(){return(ve=e((()=>{y(),L=r(),_e.__docgenInfo={description:`One Entry in the Day view list. Tap the text or times to edit it in place; tap the Tag to change it.
The "couldn't tag" note shows only when tagging gave up and the Entry has no Tag (AC-3.2).`,methods:[],displayName:`EntryRow`,props:{entry:{required:!0,tsType:{name:`intersection`,raw:`Pick<
  Tables['entries']['Row'],
  | 'id'
  | 'text'
  | 'started_at'
  | 'ended_at'
  | 'time_zone'
  | 'category_id'
  | 'tag_source'
  | 'suggested_category_id'
  | 'tagging_gave_up_at'
  | 'created_at'
> &
  // Optional until the UI fixtures and \`useLocalCopy\` carry them (they live in app/src/ui); a refresh always stores them.
  Partial<Pick<Tables['entries']['Row'], 'activity_source'>> & {
    /** The Entry's Activities (0 to 3), oldest first */
    activity_ids?: string[];
  }`,elements:[{name:`Pick`,elements:[{name:`signature['Tables']['entries']['Row']`,raw:`Tables['entries']['Row']`},{name:`union`,raw:`| 'id'
| 'text'
| 'started_at'
| 'ended_at'
| 'time_zone'
| 'category_id'
| 'tag_source'
| 'suggested_category_id'
| 'tagging_gave_up_at'
| 'created_at'`,elements:[{name:`literal`,value:`'id'`},{name:`literal`,value:`'text'`},{name:`literal`,value:`'started_at'`},{name:`literal`,value:`'ended_at'`},{name:`literal`,value:`'time_zone'`},{name:`literal`,value:`'category_id'`},{name:`literal`,value:`'tag_source'`},{name:`literal`,value:`'suggested_category_id'`},{name:`literal`,value:`'tagging_gave_up_at'`},{name:`literal`,value:`'created_at'`}]}],raw:`Pick<
  Tables['entries']['Row'],
  | 'id'
  | 'text'
  | 'started_at'
  | 'ended_at'
  | 'time_zone'
  | 'category_id'
  | 'tag_source'
  | 'suggested_category_id'
  | 'tagging_gave_up_at'
  | 'created_at'
>`},{name:`Partial`,elements:[{name:`Pick`,elements:[{name:`signature['Tables']['entries']['Row']`,raw:`Tables['entries']['Row']`},{name:`literal`,value:`'activity_source'`}],raw:`Pick<Tables['entries']['Row'], 'activity_source'>`}],raw:`Partial<Pick<Tables['entries']['Row'], 'activity_source'>>`},{name:`signature`,type:`object`,raw:`{
  /** The Entry's Activities (0 to 3), oldest first */
  activity_ids?: string[];
}`,signature:{properties:[{key:`activity_ids`,value:{name:`Array`,elements:[{name:`string`}],raw:`string[]`,required:!1},description:`The Entry's Activities (0 to 3), oldest first`}]}}]},description:``},category:{required:!1,tsType:{name:`Pick`,elements:[{name:`signature['Tables']['categories']['Row']`,raw:`Tables['categories']['Row']`},{name:`union`,raw:`'id' | 'name' | 'description' | 'status'`,elements:[{name:`literal`,value:`'id'`},{name:`literal`,value:`'name'`},{name:`literal`,value:`'description'`},{name:`literal`,value:`'status'`}]}],raw:`Pick<Tables['categories']['Row'], 'id' | 'name' | 'description' | 'status'>`},description:``},activities:{required:!1,tsType:{name:`unknown`},description:`Shown after the text as "A · B" when the Entry has any.`,defaultValue:{value:`[]`,computed:!1}},timeZone:{required:!0,tsType:{name:`string`},description:``},onEdit:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onTag:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(opener: HTMLElement) => void`,signature:{arguments:[{type:{name:`HTMLElement`},name:`opener`}],return:{name:`void`}}},description:``}}}})))()}function ye({entry:e,categories:t,online:n,onPick:r,onClose:i,returnFocusTo:a}){let o=(0,R.useRef)(null),[s,c]=(0,R.useState)(),[l,u]=(0,R.useState)(!1),d=t.filter(e=>e.status===`active`);(0,R.useEffect)(()=>(o.current?.querySelector(`button`)?.focus(),()=>a?.focus()),[a]);let f=e=>{if(e.key===`Escape`){i();return}if(e.key!==`Tab`)return;let t=[...o.current?.querySelectorAll(`button:not(:disabled)`)??[]];if(t.length===0)return;let n=t[0],r=t[t.length-1];e.shiftKey&&document.activeElement===n?(e.preventDefault(),r.focus()):!e.shiftKey&&document.activeElement===r&&(e.preventDefault(),n.focus())},p=async e=>{if(l)return;if(!n){c(`Needs a connection.`);return}u(!0),c(void 0);let t=await r(e);u(!1),t.ok||t.error===`entry_not_found`||t.error===`session_lost`?i():c(t.error===`category_not_active`?`Pick another category.`:t.error===`unknown`?`Needs a connection.`:`Couldn't save. Try again.`)};return(0,z.jsx)(`div`,{className:`sheet-backdrop`,onClick:i,children:(0,z.jsxs)(`div`,{ref:o,className:`sheet`,role:`dialog`,"aria-modal":`true`,"aria-label":`Category for ${e.text}`,onClick:e=>e.stopPropagation(),onKeyDown:f,children:[(0,z.jsx)(`strong`,{children:e.text}),(0,z.jsx)(`ul`,{children:d.map(t=>(0,z.jsx)(`li`,{children:(0,z.jsxs)(`button`,{onClick:()=>void p(t.id),disabled:l,children:[(0,z.jsx)(`span`,{className:`dot`,style:{background:T(t.name)}}),t.name,t.id===e.category_id?` ✓`:``]})},t.id))}),s&&(0,z.jsx)(`p`,{className:`error`,role:`alert`,children:s}),(0,z.jsx)(`button`,{className:`secondary`,onClick:i,disabled:l,children:`Cancel`})]})})}var R,z;function be(){return(be=e((()=>{R=n(),y(),z=r(),ye.__docgenInfo={description:`Sheet to change an Entry's Tag. Active Categories only (AC-4.1). It traps focus, Escape closes it,
and focus returns to the Tag button that opened it.`,methods:[],displayName:`TagPicker`,props:{entry:{required:!0,tsType:{name:`Pick`,elements:[{name:`intersection`,raw:`Pick<
  Tables['entries']['Row'],
  | 'id'
  | 'text'
  | 'started_at'
  | 'ended_at'
  | 'time_zone'
  | 'category_id'
  | 'tag_source'
  | 'suggested_category_id'
  | 'tagging_gave_up_at'
  | 'created_at'
> &
  // Optional until the UI fixtures and \`useLocalCopy\` carry them (they live in app/src/ui); a refresh always stores them.
  Partial<Pick<Tables['entries']['Row'], 'activity_source'>> & {
    /** The Entry's Activities (0 to 3), oldest first */
    activity_ids?: string[];
  }`,elements:[{name:`Pick`,elements:[{name:`signature['Tables']['entries']['Row']`,raw:`Tables['entries']['Row']`},{name:`union`,raw:`| 'id'
| 'text'
| 'started_at'
| 'ended_at'
| 'time_zone'
| 'category_id'
| 'tag_source'
| 'suggested_category_id'
| 'tagging_gave_up_at'
| 'created_at'`,elements:[{name:`literal`,value:`'id'`},{name:`literal`,value:`'text'`},{name:`literal`,value:`'started_at'`},{name:`literal`,value:`'ended_at'`},{name:`literal`,value:`'time_zone'`},{name:`literal`,value:`'category_id'`},{name:`literal`,value:`'tag_source'`},{name:`literal`,value:`'suggested_category_id'`},{name:`literal`,value:`'tagging_gave_up_at'`},{name:`literal`,value:`'created_at'`}]}],raw:`Pick<
  Tables['entries']['Row'],
  | 'id'
  | 'text'
  | 'started_at'
  | 'ended_at'
  | 'time_zone'
  | 'category_id'
  | 'tag_source'
  | 'suggested_category_id'
  | 'tagging_gave_up_at'
  | 'created_at'
>`},{name:`Partial`,elements:[{name:`Pick`,elements:[{name:`signature['Tables']['entries']['Row']`,raw:`Tables['entries']['Row']`},{name:`literal`,value:`'activity_source'`}],raw:`Pick<Tables['entries']['Row'], 'activity_source'>`}],raw:`Partial<Pick<Tables['entries']['Row'], 'activity_source'>>`},{name:`signature`,type:`object`,raw:`{
  /** The Entry's Activities (0 to 3), oldest first */
  activity_ids?: string[];
}`,signature:{properties:[{key:`activity_ids`,value:{name:`Array`,elements:[{name:`string`}],raw:`string[]`,required:!1},description:`The Entry's Activities (0 to 3), oldest first`}]}}]},{name:`union`,raw:`'text' | 'category_id'`,elements:[{name:`literal`,value:`'text'`},{name:`literal`,value:`'category_id'`}]}],raw:`Pick<EntryRow, 'text' | 'category_id'>`},description:``},categories:{required:!0,tsType:{name:`unknown`},description:``},online:{required:!0,tsType:{name:`boolean`},description:``},onPick:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(categoryId: string) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`string`},name:`categoryId`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}}},description:``},onClose:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},returnFocusTo:{required:!1,tsType:{name:`union`,raw:`HTMLElement | null`,elements:[{name:`HTMLElement`},{name:`null`}]},description:``}}}})))()}function xe({date:e,timeZone:t,now:n,entries:r,known:i=r,categories:a,activities:o=[],slots:l=[],refreshedAt:d,connection:p=`online`,load:h=`ready`,actions:_,onPickDay:ne,onRetry:re,initialSheet:ie,initialText:y,initialEditId:ae,initialPickerId:ce}){let[b,x]=(0,B.useState)(ie?{mode:ie,opener:null}:null),[S,le]=(0,B.useState)(!1),[C,E]=(0,B.useState)(ae),[D,me]=(0,B.useState)(ce?{id:ce,opener:null}:void 0),[O,k]=(0,B.useState)(null),A=(0,B.useRef)(null);(0,B.useLayoutEffect)(()=>{O&&A.current?.scrollIntoView?.({block:`nearest`})},[O]),(0,B.useEffect)(()=>{if(!S)return;let e=setTimeout(()=>le(!1),2e3);return()=>clearTimeout(e)},[S]);let j=(0,B.useMemo)(()=>{let t=t=>async(...n)=>{k(null);let r=await t(...n);return!r.ok&&r.error===`entry_not_found`&&k(e),r};return{createEntry:_.createEntry,editEntry:t(_.editEntry),deleteEntry:t(_.deleteEntry),setEntryTag:t(_.setEntryTag),setEntryActivities:_.setEntryActivities&&t(_.setEntryActivities)}},[_,e]),M=p!==`offline`,N=te(n,t),P=e===N,F=se(v(e,t).start,t),I=(0,B.useMemo)(()=>v(e,t),[e,t]),ge=(0,B.useMemo)(()=>fe(r,I,n),[r,I,n]),L=(0,B.useMemo)(()=>g(r,I,n),[r,I,n]),ve=(0,B.useMemo)(()=>oe(r,I,n),[r,I,n]),R=(0,B.useMemo)(()=>[0,1,2,3,4,5,6].map(e=>{let i=ee(F,e),a=v(i,t);return{date:i,start:a.start,logged:oe(r,a,n),span:a.end-a.start}}),[F,t,r,n]),z=(0,B.useMemo)(()=>new Map(a.map(e=>[e.id,e])),[a]),be=(0,B.useMemo)(()=>new Map(o.map(e=>[e.id,e])),[o]),xe=e=>[...new Set(e.activity_ids??[])].flatMap(e=>be.get(e)??[]),we=D&&r.find(e=>e.id===D.id),Te=d?w(Date.parse(d),t):null,Ee=I.end-I.start,H=e=>`${e/Ee*100}%`,U=e=>{k(null),E(void 0),ne(e)},W=se(n,t),G=b?(0,V.jsx)(ue,{mode:b.mode,day:e,entries:i,timeZone:t,now:n,connection:p,loading:h===`loading`,activities:o,slots:l,initialText:y,returnFocusTo:b.opener,onSave:j.createEntry,onSaved:()=>{x(null),le(!0)},onClose:()=>x(null)},b.mode.kind===`now`?`now`:`fill:${b.mode.start}`):we?(0,V.jsx)(ye,{entry:we,categories:a,online:M,returnFocusTo:D?.opener,onPick:e=>j.setEntryTag(we.id,e),onClose:()=>me(void 0)}):void 0;return(0,V.jsxs)(c,{tab:`day`,busy:h===`loading`,overlay:G,fab:G?void 0:(0,V.jsx)(de,{onOpen:e=>x({mode:{kind:`now`},opener:e})}),children:[(0,V.jsx)(s,{state:p,refreshedAt:Te}),(0,V.jsxs)(`header`,{className:`day-head`,children:[(0,V.jsxs)(`div`,{children:[(0,V.jsx)(`h1`,{children:P?`Today`:m(I.start,t,!0)}),(0,V.jsxs)(`p`,{className:`sub`,children:[P?`${m(I.start,t,!0)} · `:``,`week of `,Ce(F,t)]})]}),(0,V.jsxs)(`div`,{className:`wnav`,role:`group`,"aria-label":`Choose week`,children:[!P&&(0,V.jsx)(`button`,{className:`today-btn`,onClick:()=>U(N),children:`Today`}),(0,V.jsx)(`button`,{className:`icon-btn`,"aria-label":`Previous week`,onClick:()=>U(ee(e,-7)),children:(0,V.jsx)(Se,{left:!0})}),(0,V.jsx)(`button`,{className:`icon-btn`,"aria-label":`Next week`,disabled:F>=W,onClick:()=>{let t=ee(e,7);U(t>N?N:t)},children:(0,V.jsx)(Se,{})})]})]}),(0,V.jsx)(`nav`,{className:`strip`,"aria-label":`Days of the week`,children:R.map(n=>(0,V.jsxs)(`button`,{disabled:n.date>N,"aria-current":n.date===e?`date`:void 0,className:n.date===N?`today`:void 0,onClick:()=>U(n.date),children:[(0,V.jsx)(`span`,{children:new Intl.DateTimeFormat(`en-GB`,{timeZone:t,weekday:`short`}).format(n.start)}),` `,(0,V.jsx)(`b`,{children:new Intl.DateTimeFormat(`en-GB`,{timeZone:t,day:`numeric`}).format(n.start)}),` `,(0,V.jsxs)(`span`,{className:`sr-only`,children:[new Intl.DateTimeFormat(`en-GB`,{timeZone:t,month:`short`}).format(n.start),n.date>N?``:`, ${f(n.logged)} logged`]}),(0,V.jsx)(`span`,{className:`fill`,children:(0,V.jsx)(`span`,{style:{width:`${Math.min(n.logged/n.span,1)*100}%`}})})]},n.date))}),O===e&&(0,V.jsx)(`p`,{ref:A,className:`error notice`,role:`alert`,children:`This Entry was deleted.`}),(0,V.jsx)(`p`,{className:`status day-status`,"aria-live":`polite`,children:S?`Saved.`:``}),h===`loading`&&(0,V.jsx)(V.Fragment,{children:[1,2,3,4].map(e=>(0,V.jsx)(u,{style:{margin:`10px 0`}},e))}),h===`offline-earlier-week`&&(0,V.jsxs)(`div`,{className:`empty`,children:[`Earlier days need a connection.`,(0,V.jsx)(`div`,{children:(0,V.jsx)(`button`,{className:`secondary`,style:{marginTop:12},onClick:re,children:`Retry`})})]}),h===`session-lost-earlier-week`&&(0,V.jsx)(`div`,{className:`empty`,children:`Sign in to see earlier days.`}),h===`ready`&&(0,V.jsxs)(V.Fragment,{children:[(0,V.jsx)(`div`,{className:`cover`,role:`img`,"aria-label":`Logged ${f(ve)} of the day`,children:L.map(e=>{let t=e.categoryId?z.get(e.categoryId):void 0;return(0,V.jsx)(`span`,{style:{left:H(e.start-I.start),width:H(e.end-e.start),background:t?T(t.name):`var(--neutral-bar)`}},e.start)})}),(0,V.jsxs)(`div`,{className:`axis`,"aria-hidden":`true`,children:[(0,V.jsx)(`span`,{children:`00`}),(0,V.jsx)(`span`,{children:`06`}),(0,V.jsx)(`span`,{children:`12`}),(0,V.jsx)(`span`,{children:`18`}),(0,V.jsx)(`span`,{children:`24`})]}),(0,V.jsxs)(`div`,{className:`day-sum`,children:[(0,V.jsxs)(`span`,{children:[`Logged `,f(ve)]}),(0,V.jsx)(pe,{time:Te})]}),(0,V.jsx)(`section`,{className:`day-list`,"aria-label":`Entries on ${m(I.start,t,!0)}`,children:ge.map(i=>{if(i.kind===`slot`){let r=ge.length===1,a=i.end===n?`now`:i.end===I.end?`24:00`:w(i.end,t);return(0,V.jsxs)(`div`,{className:`slot`,children:[!r&&(0,V.jsxs)(`span`,{className:`when`,children:[w(i.start,t),`–`,a]}),(0,V.jsx)(`span`,{className:`what`,children:r?`Nothing logged`:`${f(i.end-i.start)} unlogged`}),(0,V.jsx)(`button`,{className:`link`,"aria-label":`Fill ${w(i.start,t)}–${a}`,onClick:t=>x({mode:{kind:`fill`,start:i.start,end:i.end,day:e},opener:t.currentTarget}),children:`Fill`})]},`slot-${i.start}`)}let a=i.entry;return a.id===C?(0,V.jsx)(he,{entry:a,siblings:r,now:n,timeZone:t,online:M,activities:o,activityNames:xe(a).map(e=>e.name),onSetActivities:j.setEntryActivities&&(e=>j.setEntryActivities(a.id,e)),onSave:e=>j.editEntry(a.id,e),onDelete:()=>j.deleteEntry(a.id),onClose:()=>E(void 0)},a.id):(0,V.jsx)(_e,{entry:a,category:a.category_id?z.get(a.category_id):void 0,activities:xe(a),timeZone:t,onEdit:()=>E(a.id),onTag:e=>me({id:a.id,opener:e})},a.id)})})]})]})}var B,V,Se,Ce;function we(){return(we=e((()=>{B=n(),l(),i(),o(),d(),ae(),ge(),ve(),ce(),le(),b(),a(),E(),x(),be(),C(),D(),y(),V=r(),Se=({left:e})=>(0,V.jsx)(`svg`,{width:`18`,height:`18`,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,strokeWidth:`2.4`,strokeLinecap:`round`,strokeLinejoin:`round`,"aria-hidden":`true`,children:(0,V.jsx)(`path`,{d:e?`M15 5l-7 7 7 7`:`M9 5l7 7-7 7`})}),Ce=(e,t)=>{let n=v(e,t).start,r=v(ee(e,6),t).start,i=e=>new Intl.DateTimeFormat(`en-GB`,{timeZone:t,month:`short`}).format(e),a=e=>new Intl.DateTimeFormat(`en-GB`,{timeZone:t,day:`numeric`}).format(e);return i(n)===i(r)?`${i(n)} ${a(n)}–${a(r)}`:`${i(n)} ${a(n)} – ${i(r)} ${a(r)}`},xe.__docgenInfo={description:`The Day view (05-ui D5, AC-1.4): a week strip to pick the day, the day's coverage, its Entries in order with
Unlogged slots to Fill, inline edit and Tag, and a floating + to log now.`,methods:[],displayName:`DayView`,props:{date:{required:!0,tsType:{name:`string`},description:"The day shown, `YYYY-MM-DD`."},timeZone:{required:!0,tsType:{name:`string`},description:``},now:{required:!0,tsType:{name:`number`},description:``},entries:{required:!0,tsType:{name:`unknown`},description:`Entries that touch the day's week (for the strip and the list).`},known:{required:!1,tsType:{name:`unknown`},description:`Every Entry known on the phone, for the Log sheet's prefill, Recent chips and overlap check.`,defaultValue:{value:`entries`,computed:!1}},categories:{required:!0,tsType:{name:`unknown`},description:``},activities:{required:!1,tsType:{name:`unknown`},description:`All of mine, Active and merged, and the slot counts for the Log sheet's chips.`,defaultValue:{value:`[]`,computed:!1}},slots:{required:!1,tsType:{name:`unknown`},description:``,defaultValue:{value:`[]`,computed:!1}},refreshedAt:{required:!0,tsType:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},description:`ISO time of the last Local copy refresh; null = never.`},connection:{required:!1,tsType:{name:`union`,raw:`'online' | 'offline' | 'signed-out'`,elements:[{name:`literal`,value:`'online'`},{name:`literal`,value:`'offline'`},{name:`literal`,value:`'signed-out'`}]},description:``,defaultValue:{value:`'online'`,computed:!1}},load:{required:!1,tsType:{name:`union`,raw:`'ready' | 'loading' | 'offline-earlier-week' | 'session-lost-earlier-week'`,elements:[{name:`literal`,value:`'ready'`},{name:`literal`,value:`'loading'`},{name:`literal`,value:`'offline-earlier-week'`},{name:`literal`,value:`'session-lost-earlier-week'`}]},description:``,defaultValue:{value:`'ready'`,computed:!1}},actions:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{
  createEntry: (entry: NewEntry) => Promise<Result<unknown>>;
  editEntry: (id: string, fields: EntryFields) => Promise<Result<unknown>>;
  deleteEntry: (id: string) => Promise<Result<unknown>>;
  setEntryTag: (entryId: string, categoryId: string) => Promise<Result<unknown>>;
  /** Replaces the Entry's Activities (0 to 3 names; empty clears). Without it the editor has no Activity picker. */
  setEntryActivities?: (entryId: string, names: string[]) => Promise<Result<unknown>>;
}`,signature:{properties:[{key:`createEntry`,value:{name:`signature`,type:`function`,raw:`(entry: NewEntry) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`intersection`,raw:`EntryFields & Pick<Tables['entries']['Row'], 'id' | 'form_opened_at'>`,elements:[{name:`Pick`,elements:[{name:`signature['Tables']['entries']['Row']`,raw:`Tables['entries']['Row']`},{name:`union`,raw:`'text' | 'started_at' | 'ended_at' | 'time_zone'`,elements:[{name:`literal`,value:`'text'`},{name:`literal`,value:`'started_at'`},{name:`literal`,value:`'ended_at'`},{name:`literal`,value:`'time_zone'`}]}],raw:`Pick<Tables['entries']['Row'], 'text' | 'started_at' | 'ended_at' | 'time_zone'>`},{name:`Pick`,elements:[{name:`signature['Tables']['entries']['Row']`,raw:`Tables['entries']['Row']`},{name:`union`,raw:`'id' | 'form_opened_at'`,elements:[{name:`literal`,value:`'id'`},{name:`literal`,value:`'form_opened_at'`}]}],raw:`Pick<Tables['entries']['Row'], 'id' | 'form_opened_at'>`}]},name:`entry`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}},required:!0}},{key:`editEntry`,value:{name:`signature`,type:`function`,raw:`(id: string, fields: EntryFields) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`string`},name:`id`},{type:{name:`Pick`,elements:[{name:`signature['Tables']['entries']['Row']`,raw:`Tables['entries']['Row']`},{name:`union`,raw:`'text' | 'started_at' | 'ended_at' | 'time_zone'`,elements:[{name:`literal`,value:`'text'`},{name:`literal`,value:`'started_at'`},{name:`literal`,value:`'ended_at'`},{name:`literal`,value:`'time_zone'`}]}],raw:`Pick<Tables['entries']['Row'], 'text' | 'started_at' | 'ended_at' | 'time_zone'>`},name:`fields`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}},required:!0}},{key:`deleteEntry`,value:{name:`signature`,type:`function`,raw:`(id: string) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`string`},name:`id`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}},required:!0}},{key:`setEntryTag`,value:{name:`signature`,type:`function`,raw:`(entryId: string, categoryId: string) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`string`},name:`entryId`},{type:{name:`string`},name:`categoryId`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}},required:!0}},{key:`setEntryActivities`,value:{name:`signature`,type:`function`,raw:`(entryId: string, names: string[]) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`string`},name:`entryId`},{type:{name:`Array`,elements:[{name:`string`}],raw:`string[]`},name:`names`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}},required:!1},description:`Replaces the Entry's Activities (0 to 3 names; empty clears). Without it the editor has no Activity picker.`}]}},description:``},onPickDay:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(date: string) => void`,signature:{arguments:[{type:{name:`string`},name:`date`}],return:{name:`void`}}},description:``},onRetry:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},initialSheet:{required:!1,tsType:{name:`union`,raw:`{ kind: 'now' } | { kind: 'fill'; start: number; end: number; day: string }`,elements:[{name:`signature`,type:`object`,raw:`{ kind: 'now' }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`'now'`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ kind: 'fill'; start: number; end: number; day: string }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`'fill'`,required:!0}},{key:`start`,value:{name:`number`,required:!0}},{key:`end`,value:{name:`number`,required:!0}},{key:`day`,value:{name:`string`,required:!0}}]}}]},description:`Start with a sheet, editor or Tag picker open (stories, Nudge).`},initialText:{required:!1,tsType:{name:`string`},description:``},initialEditId:{required:!1,tsType:{name:`string`},description:``},initialPickerId:{required:!1,tsType:{name:`string`},description:``}}}})))()}var Te=t({EarlierDayOffline:()=>Be,EarlierDaySignedOut:()=>Ve,EditActivity:()=>Qe,EditActivityAdding:()=>$,EditActivityBlank:()=>Ze,EditActivityFull:()=>et,EditActivityTooLong:()=>Xe,EditInline:()=>Le,EmptyDay:()=>Y,Fill:()=>Z,FillFails:()=>Ie,Loading:()=>ze,LogNow:()=>X,LogNowActivityChips:()=>qe,LogNowPastDay:()=>Fe,LogNowTyping:()=>Pe,LongList:()=>Ue,Offline:()=>We,PastDay:()=>J,SignedOut:()=>Ge,TagPickerOpen:()=>Re,Today:()=>q,WithActivities:()=>Ke,__namedExportsOrder:()=>tt,default:()=>Ne}),Ee,H,U,W,G,De,Oe,ke,Ae,K,je,Me,Ne,q,J,Y,X,Pe,Fe,Z,Ie,Le,Re,ze,Be,Ve,He,Ue,We,Ge,Q,Ke,qe,Je,Ye,Xe,Ze,Qe,$e,et,$,tt;function nt(){return(nt=e((()=>{we(),{expect:Ee}=__STORYBOOK_MODULE_TEST__,H=(e,t)=>({id:e,name:t,description:t,status:`active`}),U=[H(`deep`,`Deep`),H(`shallow`,`Shallow`),H(`maintenance`,`Maintenance`),H(`recovery`,`Recovery`),H(`waste`,`Waste`)],W=(e,t,n,r,i,a)=>({id:e,text:n,started_at:`2026-11-${t}T${r}:00Z`,ended_at:`2026-11-${t}T${i}:00Z`,created_at:`2026-11-${t}T${i}:00Z`,time_zone:`UTC`,category_id:a,tag_source:a?`ai`:null,suggested_category_id:null,tagging_gave_up_at:null}),G=[W(`m1`,`09`,`Planning`,`16:00`,`18:00`,`deep`),W(`m2`,`09`,`Dinner`,`18:00`,`19:00`,`recovery`),W(`t1`,`10`,`Email triage`,`07:00`,`08:00`,`shallow`),W(`t2`,`10`,`Wrote design doc`,`08:00`,`10:00`,`deep`),W(`t3`,`10`,`Standup`,`10:00`,`10:15`,null),W(`t4`,`10`,`Lunch walk`,`11:45`,`12:45`,`recovery`),{...W(`t5`,`10`,`Parking permit`,`12:45`,`13:05`,null),tagging_gave_up_at:`2026-11-10T13:30:00Z`},W(`t6`,`10`,`Code review`,`13:05`,`14:25`,`deep`)],De=[{id:`ca`,name:`Company A`,status:`active`,merged_into_id:null},{id:`lu`,name:`Lunch`,status:`active`,merged_into_id:null},{id:`sp`,name:`Side project`,status:`active`,merged_into_id:null}],Oe={t1:[`ca`],t2:[`ca`,`sp`],t4:[`lu`],t6:[`ca`],m1:[`sp`]},ke=G.map(e=>({...e,activity_ids:Oe[e.id]??[]})),Ae=[{activity_id:`ca`,dow:2,hour:14,n:6},{activity_id:`lu`,dow:2,hour:14,n:3},{activity_id:`sp`,dow:1,hour:20,n:2}],K=(e={ok:!0,data:null})=>()=>new Promise(t=>setTimeout(()=>t(e),600)),je={createEntry:K(),editEntry:K(),deleteEntry:K(),setEntryTag:K(),setEntryActivities:K()},Me=e=>Date.parse(e),Ne={title:`Screens/1 Day`,component:xe,args:{date:`2026-11-10`,timeZone:`UTC`,now:Me(`2026-11-10T14:35:00Z`),entries:G,categories:U,refreshedAt:`2026-11-10T14:30:00Z`,actions:je,onPickDay:()=>{}},parameters:{docs:{description:{component:`The home screen (05-ui D5): a week strip, the day's coverage, its Entries with Unlogged slots to Fill, and a floating + to log now. Tap + or Fill to try the mock save.`}}}},q={},J={name:`Past day (Mon 9)`,args:{date:`2026-11-09`}},Y={name:`Nothing logged`,args:{date:`2026-11-09`,entries:G.filter(e=>!e.id.startsWith(`m`))}},X={name:`Log now (+)`,args:{initialSheet:{kind:`now`}}},Pe={name:`Log now: typing`,args:{initialSheet:{kind:`now`},initialText:`Reading PR reviews`}},Fe={name:`Log now on a past day (Mon 9)`,args:{date:`2026-11-09`,initialSheet:{kind:`now`}}},Z={name:`Fill a slot (Mon 9, 19:00–23:30)`,args:{date:`2026-11-09`,entries:[...G,W(`m3`,`09`,`Late call`,`23:30`,`23:50`,`shallow`)],initialSheet:{kind:`fill`,start:Me(`2026-11-09T19:00:00Z`),end:Me(`2026-11-09T23:30:00Z`),day:`2026-11-09`},initialText:`Reading`}},Ie={name:`Fill: save fails`,args:{...Z.args,actions:{...je,createEntry:K({ok:!1,error:`unknown`})}},parameters:{docs:{description:{story:`Tap Save to see "Needs a connection."; the text stays.`}}}},Le={name:`Edit an Entry inline`,args:{initialEditId:`t2`}},Re={name:`Change a Tag`,args:{initialPickerId:`t3`}},ze={args:{load:`loading`,refreshedAt:null}},Be={name:`Earlier day: offline`,args:{date:`2026-10-21`,entries:[],load:`offline-earlier-week`,connection:`offline`}},Ve={name:`Earlier day: signed out`,args:{date:`2026-10-21`,entries:[],load:`session-lost-earlier-week`,connection:`signed-out`}},He=Array.from({length:14},(e,t)=>{let n=String(t+7).padStart(2,`0`);return W(`l${t}`,`10`,`Block ${t+1}`,`${n}:00`,`${n}:50`,t%3?`deep`:`shallow`)}),Ue={name:`Long list (scrolled to the bottom)`,args:{entries:He,now:Me(`2026-11-10T23:55:00Z`)},parameters:{docs:{description:{story:`Scrolled to the end, the last row sits fully above the + (issue #70).`}}},play:async({canvasElement:e})=>{let t=e.querySelector(`.phone-body`);t.scrollTop=t.scrollHeight,await new Promise(e=>setTimeout(e,300));let n=t.querySelectorAll(`.entry`),r=n[n.length-1].getBoundingClientRect(),i=e.querySelector(`.fab-dock`).getBoundingClientRect(),a=e.querySelector(`.fab`),o=i.top-a.offsetHeight-parseFloat(getComputedStyle(a).bottom);await Ee(r.bottom).toBeLessThanOrEqual(o)}},We={args:{connection:`offline`}},Ge={args:{connection:`signed-out`}},Q={entries:ke,activities:De,slots:Ae},Ke={name:`With Activities: shown on each Entry`,args:Q},qe={name:`With Activities: Log now chips`,args:{...Q,initialSheet:{kind:`now`}}},Je=e=>({...je,editEntry:()=>Promise.resolve({ok:!0,data:null}),setEntryActivities:()=>Promise.resolve({ok:!1,error:e})}),Ye=async({canvasElement:e})=>{await new Promise(e=>setTimeout(e,100)),[...e.querySelectorAll(`.activity-picker button`)].find(e=>e.textContent===`+ Add`)?.click(),await new Promise(e=>setTimeout(e,50));let t=e.querySelector(`.activity-picker input`);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,`value`).set.call(t,`Side project`),t.dispatchEvent(new Event(`input`,{bubbles:!0})),await new Promise(e=>setTimeout(e,50)),[...e.querySelectorAll(`.activity-picker .row-actions button`)].find(e=>e.textContent===`Add`)?.click(),await new Promise(e=>setTimeout(e,50)),[...e.querySelectorAll(`.entry-edit .row-actions button`)].find(e=>e.textContent===`Save`)?.click(),await new Promise(e=>setTimeout(e,100))},Xe={name:`With Activities: edit refused, name too long`,args:{...Q,initialEditId:`t2`,actions:Je(`activity_name_too_long`)},play:Ye},Ze={name:`With Activities: edit refused, name blank`,args:{...Q,initialEditId:`t2`,actions:Je(`activity_name_blank`)},play:Ye},Qe={name:`With Activities: edit an Entry with two Activities`,args:{...Q,initialEditId:`t2`}},$e=ke.map(e=>e.id===`t2`?{...e,activity_ids:[`ca`,`lu`,`sp`]}:e),et={name:`With Activities: edit an Entry at 3 (no + Add)`,args:{...Q,entries:$e,initialEditId:`t2`}},$={name:`With Activities: adding one`,args:{...Q,initialEditId:`t1`},play:async({canvasElement:e})=>{await new Promise(e=>setTimeout(e,100)),[...e.querySelectorAll(`.activity-picker button`)].find(e=>e.textContent===`+ Add`)?.click(),await new Promise(e=>setTimeout(e,100))}},tt=[`Today`,`PastDay`,`EmptyDay`,`LogNow`,`LogNowTyping`,`LogNowPastDay`,`Fill`,`FillFails`,`EditInline`,`TagPickerOpen`,`Loading`,`EarlierDayOffline`,`EarlierDaySignedOut`,`LongList`,`Offline`,`SignedOut`,`WithActivities`,`LogNowActivityChips`,`EditActivityTooLong`,`EditActivityBlank`,`EditActivity`,`EditActivityFull`,`EditActivityAdding`],q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`{}`,...q.parameters?.docs?.source}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`{
  name: 'Past day (Mon 9)',
  args: {
    date: '2026-11-09'
  }
}`,...J.parameters?.docs?.source}}},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
  name: 'Nothing logged',
  args: {
    date: '2026-11-09',
    entries: entries.filter(e => !e.id.startsWith('m'))
  }
}`,...Y.parameters?.docs?.source}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
  name: 'Log now (+)',
  args: {
    initialSheet: {
      kind: 'now'
    }
  }
}`,...X.parameters?.docs?.source}}},Pe.parameters={...Pe.parameters,docs:{...Pe.parameters?.docs,source:{originalSource:`{
  name: 'Log now: typing',
  args: {
    initialSheet: {
      kind: 'now'
    },
    initialText: 'Reading PR reviews'
  }
}`,...Pe.parameters?.docs?.source}}},Fe.parameters={...Fe.parameters,docs:{...Fe.parameters?.docs,source:{originalSource:`{
  name: 'Log now on a past day (Mon 9)',
  args: {
    date: '2026-11-09',
    initialSheet: {
      kind: 'now'
    }
  }
}`,...Fe.parameters?.docs?.source}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
  name: 'Fill a slot (Mon 9, 19:00–23:30)',
  args: {
    date: '2026-11-09',
    entries: [...entries, entry('m3', '09', 'Late call', '23:30', '23:50', 'shallow')],
    initialSheet: {
      kind: 'fill',
      start: at('2026-11-09T19:00:00Z'),
      end: at('2026-11-09T23:30:00Z'),
      day: '2026-11-09'
    },
    initialText: 'Reading'
  }
}`,...Z.parameters?.docs?.source}}},Ie.parameters={...Ie.parameters,docs:{...Ie.parameters?.docs,source:{originalSource:`{
  name: 'Fill: save fails',
  args: {
    ...Fill.args,
    actions: {
      ...actions,
      createEntry: later({
        ok: false,
        error: 'unknown'
      })
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Tap Save to see "Needs a connection."; the text stays.'
      }
    }
  }
}`,...Ie.parameters?.docs?.source}}},Le.parameters={...Le.parameters,docs:{...Le.parameters?.docs,source:{originalSource:`{
  name: 'Edit an Entry inline',
  args: {
    initialEditId: 't2'
  }
}`,...Le.parameters?.docs?.source}}},Re.parameters={...Re.parameters,docs:{...Re.parameters?.docs,source:{originalSource:`{
  name: 'Change a Tag',
  args: {
    initialPickerId: 't3'
  }
}`,...Re.parameters?.docs?.source}}},ze.parameters={...ze.parameters,docs:{...ze.parameters?.docs,source:{originalSource:`{
  args: {
    load: 'loading',
    refreshedAt: null
  }
}`,...ze.parameters?.docs?.source}}},Be.parameters={...Be.parameters,docs:{...Be.parameters?.docs,source:{originalSource:`{
  name: 'Earlier day: offline',
  args: {
    date: '2026-10-21',
    entries: [],
    load: 'offline-earlier-week',
    connection: 'offline'
  }
}`,...Be.parameters?.docs?.source}}},Ve.parameters={...Ve.parameters,docs:{...Ve.parameters?.docs,source:{originalSource:`{
  name: 'Earlier day: signed out',
  args: {
    date: '2026-10-21',
    entries: [],
    load: 'session-lost-earlier-week',
    connection: 'signed-out'
  }
}`,...Ve.parameters?.docs?.source}}},Ue.parameters={...Ue.parameters,docs:{...Ue.parameters?.docs,source:{originalSource:`{
  name: 'Long list (scrolled to the bottom)',
  args: {
    entries: long,
    now: at('2026-11-10T23:55:00Z')
  },
  parameters: {
    docs: {
      description: {
        story: 'Scrolled to the end, the last row sits fully above the + (issue #70).'
      }
    }
  },
  play: async ({
    canvasElement
  }) => {
    const body = canvasElement.querySelector('.phone-body') as HTMLElement;
    body.scrollTop = body.scrollHeight;
    await new Promise(r => setTimeout(r, 300));
    const rows = body.querySelectorAll('.entry');
    const last = rows[rows.length - 1].getBoundingClientRect();
    // The + hides on scroll down, so measure where it sits when shown: its top edge is size + margin above the dock.
    const dock = (canvasElement.querySelector('.fab-dock') as HTMLElement).getBoundingClientRect();
    const fab = canvasElement.querySelector('.fab') as HTMLElement;
    const shownTop = dock.top - fab.offsetHeight - parseFloat(getComputedStyle(fab).bottom);
    await expect(last.bottom).toBeLessThanOrEqual(shownTop);
  }
}`,...Ue.parameters?.docs?.source}}},We.parameters={...We.parameters,docs:{...We.parameters?.docs,source:{originalSource:`{
  args: {
    connection: 'offline'
  }
}`,...We.parameters?.docs?.source}}},Ge.parameters={...Ge.parameters,docs:{...Ge.parameters?.docs,source:{originalSource:`{
  args: {
    connection: 'signed-out'
  }
}`,...Ge.parameters?.docs?.source}}},Ke.parameters={...Ke.parameters,docs:{...Ke.parameters?.docs,source:{originalSource:`{
  name: 'With Activities: shown on each Entry',
  args: withActivities
}`,...Ke.parameters?.docs?.source}}},qe.parameters={...qe.parameters,docs:{...qe.parameters?.docs,source:{originalSource:`{
  name: 'With Activities: Log now chips',
  args: {
    ...withActivities,
    initialSheet: {
      kind: 'now'
    }
  }
}`,...qe.parameters?.docs?.source}}},Xe.parameters={...Xe.parameters,docs:{...Xe.parameters?.docs,source:{originalSource:`{
  name: 'With Activities: edit refused, name too long',
  args: {
    ...withActivities,
    initialEditId: 't2',
    actions: setActivityFails('activity_name_too_long')
  },
  play: saveWithNewActivity
}`,...Xe.parameters?.docs?.source}}},Ze.parameters={...Ze.parameters,docs:{...Ze.parameters?.docs,source:{originalSource:`{
  name: 'With Activities: edit refused, name blank',
  args: {
    ...withActivities,
    initialEditId: 't2',
    actions: setActivityFails('activity_name_blank')
  },
  play: saveWithNewActivity
}`,...Ze.parameters?.docs?.source}}},Qe.parameters={...Qe.parameters,docs:{...Qe.parameters?.docs,source:{originalSource:`{
  name: 'With Activities: edit an Entry with two Activities',
  args: {
    ...withActivities,
    initialEditId: 't2'
  }
}`,...Qe.parameters?.docs?.source}}},et.parameters={...et.parameters,docs:{...et.parameters?.docs,source:{originalSource:`{
  name: 'With Activities: edit an Entry at 3 (no + Add)',
  args: {
    ...withActivities,
    entries: threeActivities,
    initialEditId: 't2'
  }
}`,...et.parameters?.docs?.source}}},$.parameters={...$.parameters,docs:{...$.parameters?.docs,source:{originalSource:`{
  name: 'With Activities: adding one',
  args: {
    ...withActivities,
    initialEditId: 't1'
  },
  play: async ({
    canvasElement
  }: {
    canvasElement: HTMLElement;
  }) => {
    await new Promise(r => setTimeout(r, 100));
    [...canvasElement.querySelectorAll<HTMLButtonElement>('.activity-picker button')].find(b => b.textContent === '+ Add')?.click();
    await new Promise(r => setTimeout(r, 100));
  }
}`,...$.parameters?.docs?.source}}}})))()}export{nt as n,Te as t};