import{n as e,r as t}from"./rolldown-runtime-sJBDdmOt.js";import{t as n}from"./react-DlPsW1c0.js";import{t as r}from"./jsx-runtime-MKhVqBIO.js";import{c as i,n as a,o,r as s,t as c}from"./Phone-0YEjtkJY.js";import{A as l,B as u,C as d,D as f,E as p,F as m,H as h,I as ee,L as g,M as _,N as v,O as te,P as ne,R as y,T as b,U as re,V as ie,W as ae,b as oe,i as se,j as x,k as S,m as C,p as ce,t as le,w,x as T,y as E,z as ue}from"./useLocalCopy-DQ4szvxR.js";import{a as de,i as fe,t as D}from"./useWeekEntries-C9w2_k_y.js";function pe({value:e,activities:t,onChange:n,onDraft:r,disabled:i,error:a}){let o=(0,O.useId)(),[s,c]=(0,O.useState)(!1),[l,u]=(0,O.useState)(``),d=new Set(e.map(e=>e.toLowerCase())),f=t.filter(e=>e.status===`active`&&!d.has(e.name.toLowerCase())).sort((e,t)=>e.name.localeCompare(t.name)),p=e.length>=3,m=t=>{n(j([...e,t]).slice(0,3)),u(``),r?.(``),c(!1)};return(0,k.jsxs)(`div`,{className:`activity-picker`,role:`group`,"aria-label":`Activities`,children:[(0,k.jsxs)(`span`,{className:`field-label`,children:[`Activities (up to `,3,`)`]}),(0,k.jsxs)(`div`,{className:`chips`,children:[e.map(t=>(0,k.jsxs)(`button`,{type:`button`,className:`chip selected`,disabled:i,"aria-label":`Remove ${t}`,onClick:()=>n(e.filter(e=>e!==t)),children:[t,` ×`]},t)),!p&&!s&&(0,k.jsx)(`button`,{type:`button`,className:`chip add`,disabled:i,onClick:()=>c(!0),children:`+ Add`})]}),s&&!p&&(0,k.jsxs)(`div`,{className:`activity-add`,children:[(0,k.jsx)(`label`,{className:`field-label`,htmlFor:o,children:`Activity name`}),(0,k.jsx)(`input`,{id:o,className:`text`,autoFocus:!0,value:l,readOnly:i,maxLength:60,onChange:e=>{u(e.target.value),r?.(e.target.value)},onKeyDown:e=>{e.key===`Enter`&&A(l)&&(e.preventDefault(),m(l))}}),(0,k.jsx)(`div`,{className:`chips`,role:`group`,"aria-label":`Pick an Activity`,children:f.map(e=>(0,k.jsx)(`button`,{type:`button`,className:`chip`,disabled:i,onClick:()=>m(e.name),children:e.name},e.id))}),(0,k.jsxs)(`div`,{className:`row-actions`,children:[(0,k.jsx)(`button`,{type:`button`,className:`secondary`,disabled:i||!A(l),onClick:()=>m(l),children:`Add`}),(0,k.jsx)(`button`,{type:`button`,className:`link`,disabled:i,onClick:()=>{c(!1),u(``),r?.(``)},children:`Cancel`})]})]}),a&&(0,k.jsx)(`p`,{className:`error`,role:`alert`,children:a})]})}var O,k,A,j;function M(){return(M=e((()=>{O=n(),k=r(),A=e=>e.trim().replace(/\s+/g,` `),j=e=>{let t=new Set;return e.map(A).filter(e=>e&&!t.has(e.toLowerCase())&&t.add(e.toLowerCase()))},pe.__docgenInfo={description:`Change an Entry's Activities: remove one with ×, add up to 3 by picking an Active one or typing a new name (#79).
The value is the list of names; the parent saves it with the Entry.`,methods:[],displayName:`ActivityPicker`,props:{value:{required:!0,tsType:{name:`unknown`},description:``},activities:{required:!0,tsType:{name:`unknown`},description:``},onChange:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(names: string[]) => void`,signature:{arguments:[{type:{name:`Array`,elements:[{name:`string`}],raw:`string[]`},name:`names`}],return:{name:`void`}}},description:``},disabled:{required:!1,tsType:{name:`boolean`},description:``},onDraft:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(draft: string) => void`,signature:{arguments:[{type:{name:`string`},name:`draft`}],return:{name:`void`}}},description:`Called with the name being typed, '' once it is added or cancelled, so the parent can save it too.`},error:{required:!1,tsType:{name:`string`},description:`A message about a name, shown right under the field.`}}}})))()}function N({entry:e,siblings:t,now:n,timeZone:r,online:i,activities:a=[],activityNames:o=[],onSave:s,onSetActivities:c,onDelete:l,onClose:u}){let d=r,[p,m]=(0,P.useState)(e.text),[h,ee]=(0,P.useState)(Date.parse(e.started_at)),[g,v]=(0,P.useState)(Date.parse(e.ended_at)),[y,b]=(0,P.useState)(()=>[...o]),[re,ie]=(0,P.useState)(null),[ae,oe]=(0,P.useState)(),[se,x]=(0,P.useState)(``),[S,C]=(0,P.useState)(),[ce,le]=(0,P.useState)(!1),T=g>n+me?I.entry_end_in_future:h>=g?I.entry_end_not_after_start:void 0,E=p.trim()?void 0:I.entry_text_empty,ue=(0,P.useMemo)(()=>h<g?ne(t,h,g,e.id)[0]:void 0,[t,h,g,e.id]),de=ue&&`${ue.text} ${w(Date.parse(ue.started_at),d)}–${w(Date.parse(ue.ended_at),d)}`,fe=e=>e===`unknown`?`Needs a connection.`:e in I?I[e]:`Couldn't save. Try again.`,D=async(e,t)=>{ie(e),oe(void 0),C(void 0);let n=await t();ie(null),n.ok?u():n.error===`activity_name_blank`||n.error===`activity_name_too_long`?C(fe(n.error)):n.error!==`session_lost`&&n.error!==`entry_not_found`&&oe(fe(n.error))},O=e=>j(e).map(e=>e.toLowerCase()).join(`|`),k=j([...y,se]).slice(0,3),A=!!c&&O(k)!==O(o),M=()=>D(`saving`,async()=>{let e=await s({text:p.trim(),started_at:new Date(h).toISOString(),ended_at:new Date(g).toISOString(),time_zone:d});return!e.ok||!A?e:c(k)}),N=re!==null;return(0,F.jsxs)(`div`,{className:`entry-edit`,role:`group`,"aria-label":`Edit ${e.text}`,children:[(0,F.jsx)(`label`,{className:`field-label`,htmlFor:`edit-text-${e.id}`,children:`What I did`}),(0,F.jsx)(`input`,{id:`edit-text-${e.id}`,className:`text`,autoFocus:!0,value:p,readOnly:N,"aria-invalid":!!E,"aria-describedby":E?`edit-text-error-${e.id}`:void 0,onChange:e=>m(e.target.value),onKeyDown:e=>e.key===`Enter`&&!E&&!T&&i&&!N&&void M()}),E&&(0,F.jsx)(`p`,{id:`edit-text-error-${e.id}`,className:`error`,role:`alert`,children:E}),c&&(0,F.jsx)(pe,{value:y,activities:a,disabled:N,error:S,onDraft:x,onChange:e=>{b(e),C(void 0)}}),(0,F.jsxs)(`div`,{className:`times`,children:[(0,F.jsx)(te,{label:`From`,value:w(h,d),disabled:N,invalid:!!T&&h>=g,describedBy:`edit-time-error-${e.id}`,onChange:e=>ee(f(h,e,d))}),(0,F.jsx)(te,{label:`To`,value:w(g,d),disabled:N,invalid:!!T,describedBy:`edit-time-error-${e.id}`,onChange:e=>v(f(g,e,d))})]}),T&&(0,F.jsx)(`p`,{id:`edit-time-error-${e.id}`,className:`error`,role:`alert`,children:T}),(0,F.jsx)(_,{with:de}),!i&&(0,F.jsx)(`p`,{className:`note`,children:`Saving needs a connection.`}),ae&&(0,F.jsx)(`p`,{className:`error`,role:`alert`,children:ae}),(0,F.jsxs)(`div`,{className:`row-actions`,children:[(0,F.jsx)(`button`,{className:`primary small`,onClick:()=>void M(),disabled:N||!!E||!!T||!i,children:re===`saving`?`Saving…`:`Save`}),(0,F.jsx)(`button`,{className:`secondary`,onClick:u,disabled:N,children:`Cancel`}),ce?(0,F.jsxs)(`span`,{children:[`Delete?`,` `,(0,F.jsx)(`button`,{className:`link danger`,onClick:()=>void D(`deleting`,l),disabled:N||!i,children:`Yes`}),` `,(0,F.jsx)(`button`,{className:`link`,onClick:()=>le(!1),disabled:N,children:`No`})]}):(0,F.jsx)(`button`,{className:`link danger`,onClick:()=>le(!0),disabled:N||!i,children:`Delete`})]})]})}var P,F,me,I;function L(){return(L=e((()=>{P=n(),m(),M(),v(),S(),b(),F=r(),me=6e4,I={entry_text_empty:`Write what you did.`,entry_end_not_after_start:`From must be before To.`,entry_end_in_future:`To can't be later than now.`,time_zone_unknown:`Couldn't save. Try again.`,activity_name_blank:`Write an Activity name.`,activity_name_too_long:`Use 60 characters or fewer.`},N.__docgenInfo={description:`Inline editor: the row expands in place, one at a time (AC-1.3). Save and Delete need a connection (D3).
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
}`,signature:{properties:[{key:`activity_ids`,value:{name:`Array`,elements:[{name:`string`}],raw:`string[]`,required:!1},description:`The Entry's Activities (0 to 3), oldest first`}]}}]},description:``},siblings:{required:!0,tsType:{name:`unknown`},description:`Other Entries of the week, for the overlap warning.`},now:{required:!0,tsType:{name:`number`},description:``},timeZone:{required:!0,tsType:{name:`string`},description:`The device zone, as the row shows it, so the row and its editor agree after a zone change.`},online:{required:!0,tsType:{name:`boolean`},description:``},activities:{required:!1,tsType:{name:`unknown`},description:"All of mine; the picker offers the Active ones. Without `onSetActivities` there is no picker.",defaultValue:{value:`[]`,computed:!1}},activityNames:{required:!1,tsType:{name:`unknown`},description:`The Entry's current Activity names (0 to 3), oldest first.`,defaultValue:{value:`[]`,computed:!1}},onSave:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(fields: EntryFields) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`Pick`,elements:[{name:`signature['Tables']['entries']['Row']`,raw:`Tables['entries']['Row']`},{name:`union`,raw:`'text' | 'started_at' | 'ended_at' | 'time_zone'`,elements:[{name:`literal`,value:`'text'`},{name:`literal`,value:`'started_at'`},{name:`literal`,value:`'ended_at'`},{name:`literal`,value:`'time_zone'`}]}],raw:`Pick<Tables['entries']['Row'], 'text' | 'started_at' | 'ended_at' | 'time_zone'>`},name:`fields`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}}},description:``},onSetActivities:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(names: string[]) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`Array`,elements:[{name:`string`}],raw:`string[]`},name:`names`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}}},description:`Called after the fields are saved, and only when the list changed; empty = none.`},onDelete:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => Promise<Result<unknown>>`,signature:{arguments:[],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}}},description:``},onClose:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:`Called after a confirmed save or delete, and on Cancel.`}}}})))()}function he({entry:e,category:t,activities:n=[],timeZone:r,onEdit:i,onTag:a}){let o=w(Date.parse(e.started_at),r),s=w(Date.parse(e.ended_at),r),c=n.map(e=>e.name).join(` · `);return(0,R.jsxs)(`div`,{className:`entry`,children:[(0,R.jsxs)(`button`,{className:`what`,onClick:i,"aria-label":`Edit ${e.text}, ${o}–${s}${c?`, ${c}`:``}`,children:[(0,R.jsx)(`span`,{className:`text`,children:e.text}),` `,(0,R.jsxs)(`span`,{className:`when`,children:[o,`–`,s]}),c&&(0,R.jsxs)(R.Fragment,{children:[` `,(0,R.jsx)(`span`,{className:`act`,children:c})]})]}),(0,R.jsxs)(`button`,{className:t?`tag`:`tag neutral`,style:t?{background:T(t.name)}:void 0,onClick:e=>a(e.currentTarget),"aria-label":`Category: ${t?.name??`Untagged`}. Change`,children:[t?.name??`Untagged`,` ▾`]}),!t&&e.tagging_gave_up_at&&(0,R.jsx)(`span`,{className:`gaveup`,children:`Couldn't tag this one. Pick a category.`})]})}var R;function ge(){return(ge=e((()=>{b(),R=r(),he.__docgenInfo={description:`One Entry in the Day view list. Tap the text or times to edit it in place; tap the Tag to change it.
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
}`,signature:{properties:[{key:`activity_ids`,value:{name:`Array`,elements:[{name:`string`}],raw:`string[]`,required:!1},description:`The Entry's Activities (0 to 3), oldest first`}]}}]},description:``},category:{required:!1,tsType:{name:`Pick`,elements:[{name:`signature['Tables']['categories']['Row']`,raw:`Tables['categories']['Row']`},{name:`union`,raw:`'id' | 'name' | 'description' | 'status'`,elements:[{name:`literal`,value:`'id'`},{name:`literal`,value:`'name'`},{name:`literal`,value:`'description'`},{name:`literal`,value:`'status'`}]}],raw:`Pick<Tables['categories']['Row'], 'id' | 'name' | 'description' | 'status'>`},description:``},activities:{required:!1,tsType:{name:`unknown`},description:`Shown after the text as "A · B" when the Entry has any.`,defaultValue:{value:`[]`,computed:!1}},timeZone:{required:!0,tsType:{name:`string`},description:``},onEdit:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onTag:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(opener: HTMLElement) => void`,signature:{arguments:[{type:{name:`HTMLElement`},name:`opener`}],return:{name:`void`}}},description:``}}}})))()}function _e({entry:e,categories:t,online:n,onPick:r,onClose:i,returnFocusTo:a}){let o=(0,z.useRef)(null),[s,c]=(0,z.useState)(),[l,u]=(0,z.useState)(!1),d=t.filter(e=>e.status===`active`);(0,z.useEffect)(()=>(o.current?.querySelector(`button`)?.focus(),()=>a?.focus()),[a]);let f=e=>{if(e.key===`Escape`){i();return}if(e.key!==`Tab`)return;let t=[...o.current?.querySelectorAll(`button:not(:disabled)`)??[]];if(t.length===0)return;let n=t[0],r=t[t.length-1];e.shiftKey&&document.activeElement===n?(e.preventDefault(),r.focus()):!e.shiftKey&&document.activeElement===r&&(e.preventDefault(),n.focus())},p=async e=>{if(l)return;if(!n){c(`Needs a connection.`);return}u(!0),c(void 0);let t=await r(e);u(!1),t.ok||t.error===`entry_not_found`||t.error===`session_lost`?i():c(t.error===`category_not_active`?`Pick another category.`:t.error===`unknown`?`Needs a connection.`:`Couldn't save. Try again.`)};return(0,B.jsx)(`div`,{className:`sheet-backdrop`,onClick:i,children:(0,B.jsxs)(`div`,{ref:o,className:`sheet`,role:`dialog`,"aria-modal":`true`,"aria-label":`Category for ${e.text}`,onClick:e=>e.stopPropagation(),onKeyDown:f,children:[(0,B.jsx)(`strong`,{children:e.text}),(0,B.jsx)(`ul`,{children:d.map(t=>(0,B.jsx)(`li`,{children:(0,B.jsxs)(`button`,{onClick:()=>void p(t.id),disabled:l,children:[(0,B.jsx)(`span`,{className:`dot`,style:{background:T(t.name)}}),t.name,t.id===e.category_id?` ✓`:``]})},t.id))}),s&&(0,B.jsx)(`p`,{className:`error`,role:`alert`,children:s}),(0,B.jsx)(`button`,{className:`secondary`,onClick:i,disabled:l,children:`Cancel`})]})})}var z,B;function ve(){return(ve=e((()=>{z=n(),b(),B=r(),_e.__docgenInfo={description:`Sheet to change an Entry's Tag. Active Categories only (AC-4.1). It traps focus, Escape closes it,
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
}`,signature:{properties:[{key:`activity_ids`,value:{name:`Array`,elements:[{name:`string`}],raw:`string[]`,required:!1},description:`The Entry's Activities (0 to 3), oldest first`}]}}]},{name:`union`,raw:`'text' | 'category_id'`,elements:[{name:`literal`,value:`'text'`},{name:`literal`,value:`'category_id'`}]}],raw:`Pick<EntryRow, 'text' | 'category_id'>`},description:``},categories:{required:!0,tsType:{name:`unknown`},description:``},online:{required:!0,tsType:{name:`boolean`},description:``},onPick:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(categoryId: string) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`string`},name:`categoryId`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}}},description:``},onClose:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},returnFocusTo:{required:!1,tsType:{name:`union`,raw:`HTMLElement | null`,elements:[{name:`HTMLElement`},{name:`null`}]},description:``}}}})))()}function ye({date:e,timeZone:t,now:n,entries:r,known:i=r,categories:a,activities:o=[],slots:u=[],refreshedAt:f,connection:m=`online`,load:_=`ready`,actions:v,onPickDay:te,onRetry:ne,initialSheet:b,initialText:re,initialEditId:oe,initialPickerId:se}){let[x,S]=(0,V.useState)(b?{mode:b,opener:null}:null),[C,le]=(0,V.useState)(!1),[de,D]=(0,V.useState)(oe),[pe,O]=(0,V.useState)(se?{id:se,opener:null}:void 0),[k,A]=(0,V.useState)(null),j=(0,V.useRef)(null);(0,V.useLayoutEffect)(()=>{k&&j.current?.scrollIntoView?.({block:`nearest`})},[k]),(0,V.useEffect)(()=>{if(!C)return;let e=setTimeout(()=>le(!1),2e3);return()=>clearTimeout(e)},[C]);let M=(0,V.useMemo)(()=>{let t=t=>async(...n)=>{A(null);let r=await t(...n);return!r.ok&&r.error===`entry_not_found`&&A(e),r};return{createEntry:v.createEntry,editEntry:t(v.editEntry),deleteEntry:t(v.deleteEntry),setEntryTag:t(v.setEntryTag),setEntryActivities:v.setEntryActivities&&t(v.setEntryActivities)}},[v,e]),P=m!==`offline`,F=g(n,t),me=e===F,I=ae(y(e,t).start,t),L=(0,V.useMemo)(()=>y(e,t),[e,t]),R=(0,V.useMemo)(()=>ue(r,L,n),[r,L,n]),ge=(0,V.useMemo)(()=>ee(r,L,n),[r,L,n]),z=(0,V.useMemo)(()=>ie(r,L,n),[r,L,n]),B=(0,V.useMemo)(()=>[0,1,2,3,4,5,6].map(e=>{let i=h(I,e),a=y(i,t);return{date:i,start:a.start,logged:ie(r,a,n),span:a.end-a.start}}),[I,t,r,n]),ve=(0,V.useMemo)(()=>new Map(a.map(e=>[e.id,e])),[a]),ye=(0,V.useMemo)(()=>new Map(o.map(e=>[e.id,e])),[o]),Se=e=>[...new Set(e.activity_ids??[])].flatMap(e=>ye.get(e)??[]),Ce=pe&&r.find(e=>e.id===pe.id),we=f?w(Date.parse(f),t):null,U=L.end-L.start,Te=e=>`${e/U*100}%`,W=e=>{A(null),D(void 0),te(e)},G=ae(n,t),Ee=x?(0,H.jsx)(ce,{mode:x.mode,day:e,entries:i,timeZone:t,now:n,connection:m,loading:_===`loading`,activities:o,slots:u,initialText:re,returnFocusTo:x.opener,onSave:M.createEntry,onSaved:()=>{S(null),le(!0)},onClose:()=>S(null)},x.mode.kind===`now`?`now`:`fill:${x.mode.start}`):Ce?(0,H.jsx)(_e,{entry:Ce,categories:a,online:P,returnFocusTo:pe?.opener,onPick:e=>M.setEntryTag(Ce.id,e),onClose:()=>O(void 0)}):void 0;return(0,H.jsxs)(c,{tab:`day`,busy:_===`loading`,overlay:Ee,fab:Ee?void 0:(0,H.jsx)(E,{onOpen:e=>S({mode:{kind:`now`},opener:e})}),children:[(0,H.jsx)(s,{state:m,refreshedAt:we}),(0,H.jsxs)(`header`,{className:`day-head`,children:[(0,H.jsxs)(`div`,{children:[(0,H.jsx)(`h1`,{children:me?`Today`:p(L.start,t,!0)}),(0,H.jsxs)(`p`,{className:`sub`,children:[me?`${p(L.start,t,!0)} · `:``,`week of `,xe(I,t)]})]}),(0,H.jsxs)(`div`,{className:`wnav`,role:`group`,"aria-label":`Choose week`,children:[!me&&(0,H.jsx)(`button`,{className:`today-btn`,onClick:()=>W(F),children:`Today`}),(0,H.jsx)(`button`,{className:`icon-btn`,"aria-label":`Previous week`,onClick:()=>W(h(e,-7)),children:(0,H.jsx)(be,{left:!0})}),(0,H.jsx)(`button`,{className:`icon-btn`,"aria-label":`Next week`,disabled:I>=G,onClick:()=>{let t=h(e,7);W(t>F?F:t)},children:(0,H.jsx)(be,{})})]})]}),(0,H.jsx)(`nav`,{className:`strip`,"aria-label":`Days of the week`,children:B.map(n=>(0,H.jsxs)(`button`,{disabled:n.date>F,"aria-current":n.date===e?`date`:void 0,className:n.date===F?`today`:void 0,onClick:()=>W(n.date),children:[(0,H.jsx)(`span`,{children:new Intl.DateTimeFormat(`en-GB`,{timeZone:t,weekday:`short`}).format(n.start)}),` `,(0,H.jsx)(`b`,{children:new Intl.DateTimeFormat(`en-GB`,{timeZone:t,day:`numeric`}).format(n.start)}),` `,(0,H.jsxs)(`span`,{className:`sr-only`,children:[new Intl.DateTimeFormat(`en-GB`,{timeZone:t,month:`short`}).format(n.start),n.date>F?``:`, ${d(n.logged)} logged`]}),(0,H.jsx)(`span`,{className:`fill`,children:(0,H.jsx)(`span`,{style:{width:`${Math.min(n.logged/n.span,1)*100}%`}})})]},n.date))}),k===e&&(0,H.jsx)(`p`,{ref:j,className:`error notice`,role:`alert`,children:`This Entry was deleted.`}),(0,H.jsx)(`p`,{className:`status day-status`,"aria-live":`polite`,children:C?`Saved.`:``}),_===`loading`&&(0,H.jsx)(H.Fragment,{children:[1,2,3,4].map(e=>(0,H.jsx)(l,{style:{margin:`10px 0`}},e))}),_===`offline-earlier-week`&&(0,H.jsxs)(`div`,{className:`empty`,children:[`Earlier days need a connection.`,(0,H.jsx)(`div`,{children:(0,H.jsx)(`button`,{className:`secondary`,style:{marginTop:12},onClick:ne,children:`Retry`})})]}),_===`session-lost-earlier-week`&&(0,H.jsx)(`div`,{className:`empty`,children:`Sign in to see earlier days.`}),_===`ready`&&(0,H.jsxs)(H.Fragment,{children:[(0,H.jsx)(`div`,{className:`cover`,role:`img`,"aria-label":`Logged ${d(z)} of the day`,children:ge.map(e=>{let t=e.categoryId?ve.get(e.categoryId):void 0;return(0,H.jsx)(`span`,{style:{left:Te(e.start-L.start),width:Te(e.end-e.start),background:t?T(t.name):`var(--neutral-bar)`}},e.start)})}),(0,H.jsxs)(`div`,{className:`axis`,"aria-hidden":`true`,children:[(0,H.jsx)(`span`,{children:`00`}),(0,H.jsx)(`span`,{children:`06`}),(0,H.jsx)(`span`,{children:`12`}),(0,H.jsx)(`span`,{children:`18`}),(0,H.jsx)(`span`,{children:`24`})]}),(0,H.jsxs)(`div`,{className:`day-sum`,children:[(0,H.jsxs)(`span`,{children:[`Logged `,d(z)]}),(0,H.jsx)(fe,{time:we})]}),(0,H.jsx)(`section`,{className:`day-list`,"aria-label":`Entries on ${p(L.start,t,!0)}`,children:R.map(i=>{if(i.kind===`slot`){let r=R.length===1,a=i.end===n?`now`:i.end===L.end?`24:00`:w(i.end,t);return(0,H.jsxs)(`div`,{className:`slot`,children:[!r&&(0,H.jsxs)(`span`,{className:`when`,children:[w(i.start,t),`–`,a]}),(0,H.jsx)(`span`,{className:`what`,children:r?`Nothing logged`:`${d(i.end-i.start)} unlogged`}),(0,H.jsx)(`button`,{className:`link`,"aria-label":`Fill ${w(i.start,t)}–${a}`,onClick:t=>S({mode:{kind:`fill`,start:i.start,end:i.end,day:e},opener:t.currentTarget}),children:`Fill`})]},`slot-${i.start}`)}let a=i.entry;return a.id===de?(0,H.jsx)(N,{entry:a,siblings:r,now:n,timeZone:t,online:P,activities:o,activityNames:Se(a).map(e=>e.name),onSetActivities:M.setEntryActivities&&(e=>M.setEntryActivities(a.id,e)),onSave:e=>M.editEntry(a.id,e),onDelete:()=>M.deleteEntry(a.id),onClose:()=>D(void 0)},a.id):(0,H.jsx)(he,{entry:a,category:a.category_id?ve.get(a.category_id):void 0,activities:Se(a),timeZone:t,onEdit:()=>D(a.id),onTag:e=>O({id:a.id,opener:e})},a.id)})})]})]})}var V,H,be,xe;function Se(){return(Se=e((()=>{V=n(),i(),o(),u(),re(),L(),ge(),oe(),C(),se(),a(),de(),x(),ve(),le(),D(),b(),H=r(),be=({left:e})=>(0,H.jsx)(`svg`,{width:`18`,height:`18`,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,strokeWidth:`2.4`,strokeLinecap:`round`,strokeLinejoin:`round`,"aria-hidden":`true`,children:(0,H.jsx)(`path`,{d:e?`M15 5l-7 7 7 7`:`M9 5l7 7-7 7`})}),xe=(e,t)=>{let n=y(e,t).start,r=y(h(e,6),t).start,i=e=>new Intl.DateTimeFormat(`en-GB`,{timeZone:t,month:`short`}).format(e),a=e=>new Intl.DateTimeFormat(`en-GB`,{timeZone:t,day:`numeric`}).format(e);return i(n)===i(r)?`${i(n)} ${a(n)}–${a(r)}`:`${i(n)} ${a(n)} – ${i(r)} ${a(r)}`},ye.__docgenInfo={description:`The Day view (05-ui D5, AC-1.4): a week strip to pick the day, the day's coverage, its Entries in order with
Unlogged slots to Fill, inline edit and Tag, and a floating + to log now.`,methods:[],displayName:`DayView`,props:{date:{required:!0,tsType:{name:`string`},description:"The day shown, `YYYY-MM-DD`."},timeZone:{required:!0,tsType:{name:`string`},description:``},now:{required:!0,tsType:{name:`number`},description:``},entries:{required:!0,tsType:{name:`unknown`},description:`Entries that touch the day's week (for the strip and the list).`},known:{required:!1,tsType:{name:`unknown`},description:`Every Entry known on the phone, for the Log sheet's prefill, Recent chips and overlap check.`,defaultValue:{value:`entries`,computed:!1}},categories:{required:!0,tsType:{name:`unknown`},description:``},activities:{required:!1,tsType:{name:`unknown`},description:`All of mine, Active and merged, and the slot counts for the Log sheet's chips.`,defaultValue:{value:`[]`,computed:!1}},slots:{required:!1,tsType:{name:`unknown`},description:``,defaultValue:{value:`[]`,computed:!1}},refreshedAt:{required:!0,tsType:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},description:`ISO time of the last Local copy refresh; null = never.`},connection:{required:!1,tsType:{name:`union`,raw:`'online' | 'offline' | 'signed-out'`,elements:[{name:`literal`,value:`'online'`},{name:`literal`,value:`'offline'`},{name:`literal`,value:`'signed-out'`}]},description:``,defaultValue:{value:`'online'`,computed:!1}},load:{required:!1,tsType:{name:`union`,raw:`'ready' | 'loading' | 'offline-earlier-week' | 'session-lost-earlier-week'`,elements:[{name:`literal`,value:`'ready'`},{name:`literal`,value:`'loading'`},{name:`literal`,value:`'offline-earlier-week'`},{name:`literal`,value:`'session-lost-earlier-week'`}]},description:``,defaultValue:{value:`'ready'`,computed:!1}},actions:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{
  createEntry: (entry: NewEntry) => Promise<Result<unknown>>;
  editEntry: (id: string, fields: EntryFields) => Promise<Result<unknown>>;
  deleteEntry: (id: string) => Promise<Result<unknown>>;
  setEntryTag: (entryId: string, categoryId: string) => Promise<Result<unknown>>;
  /** Replaces the Entry's Activities (0 to 3 names; empty clears). Without it the editor has no Activity picker. */
  setEntryActivities?: (entryId: string, names: string[]) => Promise<Result<unknown>>;
}`,signature:{properties:[{key:`createEntry`,value:{name:`signature`,type:`function`,raw:`(entry: NewEntry) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`intersection`,raw:`EntryFields & Pick<Tables['entries']['Row'], 'id' | 'form_opened_at'>`,elements:[{name:`Pick`,elements:[{name:`signature['Tables']['entries']['Row']`,raw:`Tables['entries']['Row']`},{name:`union`,raw:`'text' | 'started_at' | 'ended_at' | 'time_zone'`,elements:[{name:`literal`,value:`'text'`},{name:`literal`,value:`'started_at'`},{name:`literal`,value:`'ended_at'`},{name:`literal`,value:`'time_zone'`}]}],raw:`Pick<Tables['entries']['Row'], 'text' | 'started_at' | 'ended_at' | 'time_zone'>`},{name:`Pick`,elements:[{name:`signature['Tables']['entries']['Row']`,raw:`Tables['entries']['Row']`},{name:`union`,raw:`'id' | 'form_opened_at'`,elements:[{name:`literal`,value:`'id'`},{name:`literal`,value:`'form_opened_at'`}]}],raw:`Pick<Tables['entries']['Row'], 'id' | 'form_opened_at'>`}]},name:`entry`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}},required:!0}},{key:`editEntry`,value:{name:`signature`,type:`function`,raw:`(id: string, fields: EntryFields) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`string`},name:`id`},{type:{name:`Pick`,elements:[{name:`signature['Tables']['entries']['Row']`,raw:`Tables['entries']['Row']`},{name:`union`,raw:`'text' | 'started_at' | 'ended_at' | 'time_zone'`,elements:[{name:`literal`,value:`'text'`},{name:`literal`,value:`'started_at'`},{name:`literal`,value:`'ended_at'`},{name:`literal`,value:`'time_zone'`}]}],raw:`Pick<Tables['entries']['Row'], 'text' | 'started_at' | 'ended_at' | 'time_zone'>`},name:`fields`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}},required:!0}},{key:`deleteEntry`,value:{name:`signature`,type:`function`,raw:`(id: string) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`string`},name:`id`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}},required:!0}},{key:`setEntryTag`,value:{name:`signature`,type:`function`,raw:`(entryId: string, categoryId: string) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`string`},name:`entryId`},{type:{name:`string`},name:`categoryId`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}},required:!0}},{key:`setEntryActivities`,value:{name:`signature`,type:`function`,raw:`(entryId: string, names: string[]) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`string`},name:`entryId`},{type:{name:`Array`,elements:[{name:`string`}],raw:`string[]`},name:`names`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}},required:!1},description:`Replaces the Entry's Activities (0 to 3 names; empty clears). Without it the editor has no Activity picker.`}]}},description:``},onPickDay:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(date: string) => void`,signature:{arguments:[{type:{name:`string`},name:`date`}],return:{name:`void`}}},description:``},onRetry:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},initialSheet:{required:!1,tsType:{name:`union`,raw:`{ kind: 'now' } | { kind: 'fill'; start: number; end: number; day: string }`,elements:[{name:`signature`,type:`object`,raw:`{ kind: 'now' }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`'now'`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ kind: 'fill'; start: number; end: number; day: string }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`'fill'`,required:!0}},{key:`start`,value:{name:`number`,required:!0}},{key:`end`,value:{name:`number`,required:!0}},{key:`day`,value:{name:`string`,required:!0}}]}}]},description:`Start with a sheet, editor or Tag picker open (stories, Nudge).`},initialText:{required:!1,tsType:{name:`string`},description:``},initialEditId:{required:!1,tsType:{name:`string`},description:``},initialPickerId:{required:!1,tsType:{name:`string`},description:``}}}})))()}var Ce=t({EarlierDayOffline:()=>Be,EarlierDaySignedOut:()=>Ve,EditActivity:()=>Ze,EditActivityAdding:()=>$,EditActivityBlank:()=>Xe,EditActivityFull:()=>$e,EditActivityTooLong:()=>Ye,EditInline:()=>Le,EmptyDay:()=>Y,Fill:()=>X,FillFails:()=>Ie,Loading:()=>ze,LogNow:()=>Ne,LogNowActivityChips:()=>Ke,LogNowPastDay:()=>Fe,LogNowTyping:()=>Pe,LongList:()=>Ue,Offline:()=>Z,PastDay:()=>J,SignedOut:()=>We,TagPickerOpen:()=>Re,Today:()=>q,WithActivities:()=>Ge,__namedExportsOrder:()=>et,default:()=>Me}),we,U,Te,W,G,Ee,De,Oe,ke,K,Ae,je,Me,q,J,Y,Ne,Pe,Fe,X,Ie,Le,Re,ze,Be,Ve,He,Ue,Z,We,Q,Ge,Ke,qe,Je,Ye,Xe,Ze,Qe,$e,$,et;function tt(){return(tt=e((()=>{Se(),{expect:we}=__STORYBOOK_MODULE_TEST__,U=(e,t)=>({id:e,name:t,description:t,status:`active`}),Te=[U(`deep`,`Deep`),U(`shallow`,`Shallow`),U(`maintenance`,`Maintenance`),U(`recovery`,`Recovery`),U(`waste`,`Waste`)],W=(e,t,n,r,i,a)=>({id:e,text:n,started_at:`2026-11-${t}T${r}:00Z`,ended_at:`2026-11-${t}T${i}:00Z`,created_at:`2026-11-${t}T${i}:00Z`,time_zone:`UTC`,category_id:a,tag_source:a?`ai`:null,suggested_category_id:null,tagging_gave_up_at:null}),G=[W(`m1`,`09`,`Planning`,`16:00`,`18:00`,`deep`),W(`m2`,`09`,`Dinner`,`18:00`,`19:00`,`recovery`),W(`t1`,`10`,`Email triage`,`07:00`,`08:00`,`shallow`),W(`t2`,`10`,`Wrote design doc`,`08:00`,`10:00`,`deep`),W(`t3`,`10`,`Standup`,`10:00`,`10:15`,null),W(`t4`,`10`,`Lunch walk`,`11:45`,`12:45`,`recovery`),{...W(`t5`,`10`,`Parking permit`,`12:45`,`13:05`,null),tagging_gave_up_at:`2026-11-10T13:30:00Z`},W(`t6`,`10`,`Code review`,`13:05`,`14:25`,`deep`)],Ee=[{id:`ca`,name:`Company A`,status:`active`,merged_into_id:null},{id:`lu`,name:`Lunch`,status:`active`,merged_into_id:null},{id:`sp`,name:`Side project`,status:`active`,merged_into_id:null}],De={t1:[`ca`],t2:[`ca`,`sp`],t4:[`lu`],t6:[`ca`],m1:[`sp`]},Oe=G.map(e=>({...e,activity_ids:De[e.id]??[]})),ke=[{activity_id:`ca`,dow:2,hour:14,n:6},{activity_id:`lu`,dow:2,hour:14,n:3},{activity_id:`sp`,dow:1,hour:20,n:2}],K=(e={ok:!0,data:null})=>()=>new Promise(t=>setTimeout(()=>t(e),600)),Ae={createEntry:K(),editEntry:K(),deleteEntry:K(),setEntryTag:K(),setEntryActivities:K()},je=e=>Date.parse(e),Me={title:`Screens/1 Day`,component:ye,args:{date:`2026-11-10`,timeZone:`UTC`,now:je(`2026-11-10T14:35:00Z`),entries:G,categories:Te,refreshedAt:`2026-11-10T14:30:00Z`,actions:Ae,onPickDay:()=>{}},parameters:{docs:{description:{component:`The home screen (05-ui D5): a week strip, the day's coverage, its Entries with Unlogged slots to Fill, and a floating + to log now. Tap + or Fill to try the mock save.`}}}},q={},J={name:`Past day (Mon 9)`,args:{date:`2026-11-09`}},Y={name:`Nothing logged`,args:{date:`2026-11-09`,entries:G.filter(e=>!e.id.startsWith(`m`))}},Ne={name:`Log now (+)`,args:{initialSheet:{kind:`now`}}},Pe={name:`Log now: typing`,args:{initialSheet:{kind:`now`},initialText:`Reading PR reviews`}},Fe={name:`Log now on a past day (Mon 9)`,args:{date:`2026-11-09`,initialSheet:{kind:`now`}}},X={name:`Fill a slot (Mon 9, 19:00–23:30)`,args:{date:`2026-11-09`,entries:[...G,W(`m3`,`09`,`Late call`,`23:30`,`23:50`,`shallow`)],initialSheet:{kind:`fill`,start:je(`2026-11-09T19:00:00Z`),end:je(`2026-11-09T23:30:00Z`),day:`2026-11-09`},initialText:`Reading`}},Ie={name:`Fill: save fails`,args:{...X.args,actions:{...Ae,createEntry:K({ok:!1,error:`unknown`})}},parameters:{docs:{description:{story:`Tap Save to see "Needs a connection."; the text stays.`}}}},Le={name:`Edit an Entry inline`,args:{initialEditId:`t2`}},Re={name:`Change a Tag`,args:{initialPickerId:`t3`}},ze={args:{load:`loading`,refreshedAt:null}},Be={name:`Earlier day: offline`,args:{date:`2026-10-21`,entries:[],load:`offline-earlier-week`,connection:`offline`}},Ve={name:`Earlier day: signed out`,args:{date:`2026-10-21`,entries:[],load:`session-lost-earlier-week`,connection:`signed-out`}},He=Array.from({length:14},(e,t)=>{let n=String(t+7).padStart(2,`0`);return W(`l${t}`,`10`,`Block ${t+1}`,`${n}:00`,`${n}:50`,t%3?`deep`:`shallow`)}),Ue={name:`Long list (scrolled to the bottom)`,args:{entries:He,now:je(`2026-11-10T23:55:00Z`)},parameters:{docs:{description:{story:`Scrolled to the end, the last row sits fully above the + (issue #70).`}}},play:async({canvasElement:e})=>{let t=e.querySelector(`.phone-body`);t.scrollTop=t.scrollHeight,await new Promise(e=>setTimeout(e,300));let n=t.querySelectorAll(`.entry`),r=n[n.length-1].getBoundingClientRect(),i=e.querySelector(`.fab-dock`).getBoundingClientRect(),a=e.querySelector(`.fab`),o=i.top-a.offsetHeight-parseFloat(getComputedStyle(a).bottom);await we(r.bottom).toBeLessThanOrEqual(o)}},Z={args:{connection:`offline`}},We={args:{connection:`signed-out`}},Q={entries:Oe,activities:Ee,slots:ke},Ge={name:`With Activities: shown on each Entry`,args:Q},Ke={name:`With Activities: Log now chips`,args:{...Q,initialSheet:{kind:`now`}}},qe=e=>({...Ae,editEntry:()=>Promise.resolve({ok:!0,data:null}),setEntryActivities:()=>Promise.resolve({ok:!1,error:e})}),Je=async({canvasElement:e})=>{await new Promise(e=>setTimeout(e,100)),[...e.querySelectorAll(`.activity-picker button`)].find(e=>e.textContent===`+ Add`)?.click(),await new Promise(e=>setTimeout(e,50));let t=e.querySelector(`.activity-picker input`);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,`value`).set.call(t,`Side project`),t.dispatchEvent(new Event(`input`,{bubbles:!0})),await new Promise(e=>setTimeout(e,50)),[...e.querySelectorAll(`.activity-picker .row-actions button`)].find(e=>e.textContent===`Add`)?.click(),await new Promise(e=>setTimeout(e,50)),[...e.querySelectorAll(`.entry-edit .row-actions button`)].find(e=>e.textContent===`Save`)?.click(),await new Promise(e=>setTimeout(e,100))},Ye={name:`With Activities: edit refused, name too long`,args:{...Q,initialEditId:`t2`,actions:qe(`activity_name_too_long`)},play:Je},Xe={name:`With Activities: edit refused, name blank`,args:{...Q,initialEditId:`t2`,actions:qe(`activity_name_blank`)},play:Je},Ze={name:`With Activities: edit an Entry with two Activities`,args:{...Q,initialEditId:`t2`}},Qe=Oe.map(e=>e.id===`t2`?{...e,activity_ids:[`ca`,`lu`,`sp`]}:e),$e={name:`With Activities: edit an Entry at 3 (no + Add)`,args:{...Q,entries:Qe,initialEditId:`t2`}},$={name:`With Activities: adding one`,args:{...Q,initialEditId:`t1`},play:async({canvasElement:e})=>{await new Promise(e=>setTimeout(e,100)),[...e.querySelectorAll(`.activity-picker button`)].find(e=>e.textContent===`+ Add`)?.click(),await new Promise(e=>setTimeout(e,100))}},et=[`Today`,`PastDay`,`EmptyDay`,`LogNow`,`LogNowTyping`,`LogNowPastDay`,`Fill`,`FillFails`,`EditInline`,`TagPickerOpen`,`Loading`,`EarlierDayOffline`,`EarlierDaySignedOut`,`LongList`,`Offline`,`SignedOut`,`WithActivities`,`LogNowActivityChips`,`EditActivityTooLong`,`EditActivityBlank`,`EditActivity`,`EditActivityFull`,`EditActivityAdding`],q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`{}`,...q.parameters?.docs?.source}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`{
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
}`,...Y.parameters?.docs?.source}}},Ne.parameters={...Ne.parameters,docs:{...Ne.parameters?.docs,source:{originalSource:`{
  name: 'Log now (+)',
  args: {
    initialSheet: {
      kind: 'now'
    }
  }
}`,...Ne.parameters?.docs?.source}}},Pe.parameters={...Pe.parameters,docs:{...Pe.parameters?.docs,source:{originalSource:`{
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
}`,...Fe.parameters?.docs?.source}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
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
}`,...X.parameters?.docs?.source}}},Ie.parameters={...Ie.parameters,docs:{...Ie.parameters?.docs,source:{originalSource:`{
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
}`,...Ue.parameters?.docs?.source}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
  args: {
    connection: 'offline'
  }
}`,...Z.parameters?.docs?.source}}},We.parameters={...We.parameters,docs:{...We.parameters?.docs,source:{originalSource:`{
  args: {
    connection: 'signed-out'
  }
}`,...We.parameters?.docs?.source}}},Ge.parameters={...Ge.parameters,docs:{...Ge.parameters?.docs,source:{originalSource:`{
  name: 'With Activities: shown on each Entry',
  args: withActivities
}`,...Ge.parameters?.docs?.source}}},Ke.parameters={...Ke.parameters,docs:{...Ke.parameters?.docs,source:{originalSource:`{
  name: 'With Activities: Log now chips',
  args: {
    ...withActivities,
    initialSheet: {
      kind: 'now'
    }
  }
}`,...Ke.parameters?.docs?.source}}},Ye.parameters={...Ye.parameters,docs:{...Ye.parameters?.docs,source:{originalSource:`{
  name: 'With Activities: edit refused, name too long',
  args: {
    ...withActivities,
    initialEditId: 't2',
    actions: setActivityFails('activity_name_too_long')
  },
  play: saveWithNewActivity
}`,...Ye.parameters?.docs?.source}}},Xe.parameters={...Xe.parameters,docs:{...Xe.parameters?.docs,source:{originalSource:`{
  name: 'With Activities: edit refused, name blank',
  args: {
    ...withActivities,
    initialEditId: 't2',
    actions: setActivityFails('activity_name_blank')
  },
  play: saveWithNewActivity
}`,...Xe.parameters?.docs?.source}}},Ze.parameters={...Ze.parameters,docs:{...Ze.parameters?.docs,source:{originalSource:`{
  name: 'With Activities: edit an Entry with two Activities',
  args: {
    ...withActivities,
    initialEditId: 't2'
  }
}`,...Ze.parameters?.docs?.source}}},$e.parameters={...$e.parameters,docs:{...$e.parameters?.docs,source:{originalSource:`{
  name: 'With Activities: edit an Entry at 3 (no + Add)',
  args: {
    ...withActivities,
    entries: threeActivities,
    initialEditId: 't2'
  }
}`,...$e.parameters?.docs?.source}}},$.parameters={...$.parameters,docs:{...$.parameters?.docs,source:{originalSource:`{
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
}`,...$.parameters?.docs?.source}}}})))()}export{tt as n,Ce as t};