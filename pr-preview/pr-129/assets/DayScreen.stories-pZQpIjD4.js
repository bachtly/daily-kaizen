import{n as e,r as t}from"./rolldown-runtime-sJBDdmOt.js";import{t as n}from"./react-DlPsW1c0.js";import{t as r}from"./jsx-runtime-MKhVqBIO.js";import{c as i,i as a,o,t as s}from"./ConnectionBanner-Du4vdfqA.js";import{a as c,b as l,c as u,d,i as f,l as p,o as m,t as ee,u as h,y as te}from"./weekFormat-833yCdOj.js";import{A as g,C as _,D as ne,E as re,M as ie,N as ae,O as oe,S as se,T as ce,b as le,i as ue,j as de,k as v,m as y,p as fe,t as b,w as x,x as S,y as pe}from"./useLocalCopy-CPB4YlXb.js";import{n as C,t as me}from"./Phone-BfrqNNzq.js";import{a as w,i as he,t as ge}from"./useWeekEntries-BKVkEnlk.js";function _e({value:e,activities:t,onChange:n,onDraft:r,disabled:i,error:a}){let o=(0,T.useId)(),[s,c]=(0,T.useState)(!1),[l,u]=(0,T.useState)(``),d=new Set(e.map(e=>e.toLowerCase())),f=t.filter(e=>e.status===`active`&&!d.has(e.name.toLowerCase())).sort((e,t)=>e.name.localeCompare(t.name)),p=e.length>=3,m=t=>{n(O([...e,t]).slice(0,3)),u(``),r?.(``),c(!1)};return(0,E.jsxs)(`div`,{className:`activity-picker`,role:`group`,"aria-label":`Activities`,children:[(0,E.jsxs)(`span`,{className:`field-label`,children:[`Activities (up to `,3,`)`]}),(0,E.jsxs)(`div`,{className:`chips`,children:[e.map(t=>(0,E.jsxs)(`button`,{type:`button`,className:`chip selected`,disabled:i,"aria-label":`Remove ${t}`,onClick:()=>n(e.filter(e=>e!==t)),children:[t,` ×`]},t)),!p&&!s&&(0,E.jsx)(`button`,{type:`button`,className:`chip add`,disabled:i,onClick:()=>c(!0),children:`+ Add`})]}),s&&!p&&(0,E.jsxs)(`div`,{className:`activity-add`,children:[(0,E.jsx)(`label`,{className:`field-label`,htmlFor:o,children:`Activity name`}),(0,E.jsx)(`input`,{id:o,className:`text`,autoFocus:!0,value:l,readOnly:i,maxLength:60,onChange:e=>{u(e.target.value),r?.(e.target.value)},onKeyDown:e=>{e.key===`Enter`&&D(l)&&(e.preventDefault(),m(l))}}),(0,E.jsx)(`div`,{className:`chips`,role:`group`,"aria-label":`Pick an Activity`,children:f.map(e=>(0,E.jsx)(`button`,{type:`button`,className:`chip`,disabled:i,onClick:()=>m(e.name),children:e.name},e.id))}),(0,E.jsxs)(`div`,{className:`row-actions`,children:[(0,E.jsx)(`button`,{type:`button`,className:`secondary`,disabled:i||!D(l),onClick:()=>m(l),children:`Add`}),(0,E.jsx)(`button`,{type:`button`,className:`link`,disabled:i,onClick:()=>{c(!1),u(``),r?.(``)},children:`Cancel`})]})]}),a&&(0,E.jsx)(`p`,{className:`error`,role:`alert`,children:a})]})}var T,E,D,O;function k(){return(k=e((()=>{T=n(),E=r(),D=e=>e.trim().replace(/\s+/g,` `),O=e=>{let t=new Set;return e.map(D).filter(e=>e&&!t.has(e.toLowerCase())&&t.add(e.toLowerCase()))},_e.__docgenInfo={description:`Change an Entry's Activities: remove one with ×, add up to 3 by picking an Active one or typing a new name (#79).
The value is the list of names; the parent saves it with the Entry.`,methods:[],displayName:`ActivityPicker`,props:{value:{required:!0,tsType:{name:`unknown`},description:``},activities:{required:!0,tsType:{name:`unknown`},description:``},onChange:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(names: string[]) => void`,signature:{arguments:[{type:{name:`Array`,elements:[{name:`string`}],raw:`string[]`},name:`names`}],return:{name:`void`}}},description:``},disabled:{required:!1,tsType:{name:`boolean`},description:``},onDraft:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(draft: string) => void`,signature:{arguments:[{type:{name:`string`},name:`draft`}],return:{name:`void`}}},description:`Called with the name being typed, '' once it is added or cancelled, so the parent can save it too.`},error:{required:!1,tsType:{name:`string`},description:`A message about a name, shown right under the field.`}}}})))()}function ve({entry:e,siblings:t,now:n,timeZone:r,online:i,activities:a=[],activityNames:o=[],onSave:s,onSetActivities:l,onDelete:u,onClose:d}){let f=r,[m,ee]=(0,A.useState)(e.text),[h,te]=(0,A.useState)(Date.parse(e.started_at)),[g,ne]=(0,A.useState)(Date.parse(e.ended_at)),[re,ie]=(0,A.useState)(()=>[...o]),[ae,oe]=(0,A.useState)(null),[se,le]=(0,A.useState)(),[ue,de]=(0,A.useState)(``),[v,y]=(0,A.useState)(),[fe,b]=(0,A.useState)(!1),x=g>n+M?N.entry_end_in_future:h>=g?N.entry_end_not_after_start:void 0,S=m.trim()?void 0:N.entry_text_empty,C=(0,A.useMemo)(()=>h<g?ce(t,h,g,e.id)[0]:void 0,[t,h,g,e.id]),me=C&&`${C.text} ${c(Date.parse(C.started_at),f)}–${c(Date.parse(C.ended_at),f)}`,w=e=>e===`unknown`?`Needs a connection.`:e in N?N[e]:`Couldn't save. Try again.`,he=async(e,t)=>{oe(e),le(void 0),y(void 0);let n=await t();oe(null),n.ok?d():n.error===`activity_name_blank`||n.error===`activity_name_too_long`?y(w(n.error)):n.error!==`session_lost`&&n.error!==`entry_not_found`&&le(w(n.error))},ge=e=>O(e).map(e=>e.toLowerCase()).join(`|`),T=O([...re,ue]).slice(0,3),E=!!l&&ge(T)!==ge(o),D=()=>he(`saving`,async()=>{let e=await s({text:m.trim(),started_at:new Date(h).toISOString(),ended_at:new Date(g).toISOString(),time_zone:f});return!e.ok||!E?e:l(T)}),k=ae!==null;return(0,j.jsxs)(`div`,{className:`entry-edit`,role:`group`,"aria-label":`Edit ${e.text}`,children:[(0,j.jsx)(`label`,{className:`field-label`,htmlFor:`edit-text-${e.id}`,children:`What I did`}),(0,j.jsx)(`input`,{id:`edit-text-${e.id}`,className:`text`,autoFocus:!0,value:m,readOnly:k,"aria-invalid":!!S,"aria-describedby":S?`edit-text-error-${e.id}`:void 0,onChange:e=>ee(e.target.value),onKeyDown:e=>e.key===`Enter`&&!S&&!x&&i&&!k&&void D()}),S&&(0,j.jsx)(`p`,{id:`edit-text-error-${e.id}`,className:`error`,role:`alert`,children:S}),l&&(0,j.jsx)(_e,{value:re,activities:a,disabled:k,error:v,onDraft:de,onChange:e=>{ie(e),y(void 0)}}),(0,j.jsxs)(`div`,{className:`times`,children:[(0,j.jsx)(pe,{label:`From`,value:c(h,f),disabled:k,invalid:!!x&&h>=g,describedBy:`edit-time-error-${e.id}`,onChange:e=>te(p(h,e,f))}),(0,j.jsx)(pe,{label:`To`,value:c(g,f),disabled:k,invalid:!!x,describedBy:`edit-time-error-${e.id}`,onChange:e=>ne(p(g,e,f))})]}),x&&(0,j.jsx)(`p`,{id:`edit-time-error-${e.id}`,className:`error`,role:`alert`,children:x}),(0,j.jsx)(_,{with:me}),!i&&(0,j.jsx)(`p`,{className:`note`,children:`Saving needs a connection.`}),se&&(0,j.jsx)(`p`,{className:`error`,role:`alert`,children:se}),(0,j.jsxs)(`div`,{className:`row-actions`,children:[(0,j.jsx)(`button`,{className:`primary small`,onClick:()=>void D(),disabled:k||!!S||!!x||!i,children:ae===`saving`?`Saving…`:`Save`}),(0,j.jsx)(`button`,{className:`secondary`,onClick:d,disabled:k,children:`Cancel`}),fe?(0,j.jsxs)(`span`,{children:[`Delete?`,` `,(0,j.jsx)(`button`,{className:`link danger`,onClick:()=>void he(`deleting`,u),disabled:k||!i,children:`Yes`}),` `,(0,j.jsx)(`button`,{className:`link`,onClick:()=>b(!1),disabled:k,children:`No`})]}):(0,j.jsx)(`button`,{className:`link danger`,onClick:()=>b(!0),disabled:k||!i,children:`Delete`})]})]})}var A,j,M,N;function ye(){return(ye=e((()=>{A=n(),re(),k(),x(),le(),m(),j=r(),M=6e4,N={entry_text_empty:`Write what you did.`,entry_end_not_after_start:`From must be before To.`,entry_end_in_future:`To can't be later than now.`,time_zone_unknown:`Couldn't save. Try again.`,activity_name_blank:`Write an Activity name.`,activity_name_too_long:`Use 60 characters or fewer.`},ve.__docgenInfo={description:`Inline editor: the row expands in place, one at a time (AC-1.3). Save and Delete need a connection (D3).
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
}`,signature:{properties:[{key:`activity_ids`,value:{name:`Array`,elements:[{name:`string`}],raw:`string[]`,required:!1},description:`The Entry's Activities (0 to 3), oldest first`}]}}]},description:``},siblings:{required:!0,tsType:{name:`unknown`},description:`Other Entries of the week, for the overlap warning.`},now:{required:!0,tsType:{name:`number`},description:``},timeZone:{required:!0,tsType:{name:`string`},description:`The device zone, as the row shows it, so the row and its editor agree after a zone change.`},online:{required:!0,tsType:{name:`boolean`},description:``},activities:{required:!1,tsType:{name:`unknown`},description:"All of mine; the picker offers the Active ones. Without `onSetActivities` there is no picker.",defaultValue:{value:`[]`,computed:!1}},activityNames:{required:!1,tsType:{name:`unknown`},description:`The Entry's current Activity names (0 to 3), oldest first.`,defaultValue:{value:`[]`,computed:!1}},onSave:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(fields: EntryFields) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`Pick`,elements:[{name:`signature['Tables']['entries']['Row']`,raw:`Tables['entries']['Row']`},{name:`union`,raw:`'text' | 'started_at' | 'ended_at' | 'time_zone'`,elements:[{name:`literal`,value:`'text'`},{name:`literal`,value:`'started_at'`},{name:`literal`,value:`'ended_at'`},{name:`literal`,value:`'time_zone'`}]}],raw:`Pick<Tables['entries']['Row'], 'text' | 'started_at' | 'ended_at' | 'time_zone'>`},name:`fields`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}}},description:``},onSetActivities:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(names: string[]) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`Array`,elements:[{name:`string`}],raw:`string[]`},name:`names`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}}},description:`Called after the fields are saved, and only when the list changed; empty = none.`},onDelete:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => Promise<Result<unknown>>`,signature:{arguments:[],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}}},description:``},onClose:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:`Called after a confirmed save or delete, and on Cancel.`}}}})))()}function be({entry:e,category:t,activities:n=[],timeZone:r,onEdit:i,onTag:a}){let o=c(Date.parse(e.started_at),r),s=c(Date.parse(e.ended_at),r),l=n.map(e=>e.name).join(` · `);return(0,P.jsxs)(`div`,{className:`entry`,children:[(0,P.jsxs)(`button`,{className:`what`,onClick:i,"aria-label":`Edit ${e.text}, ${o}–${s}${l?`, ${l}`:``}`,children:[(0,P.jsx)(`span`,{className:`text`,children:e.text}),` `,(0,P.jsxs)(`span`,{className:`when`,children:[o,`–`,s]}),l&&(0,P.jsxs)(P.Fragment,{children:[` `,(0,P.jsx)(`span`,{className:`act`,children:l})]})]}),(0,P.jsxs)(`button`,{className:t?`tag`:`tag neutral`,style:t?{background:ee(t.name)}:void 0,onClick:e=>a(e.currentTarget),"aria-label":`Category: ${t?.name??`Untagged`}. Change`,children:[t?.name??`Untagged`,` ▾`]}),!t&&e.tagging_gave_up_at&&(0,P.jsx)(`span`,{className:`gaveup`,children:`Couldn't tag this one. Pick a category.`})]})}var P;function xe(){return(xe=e((()=>{m(),P=r(),be.__docgenInfo={description:`One Entry in the Day view list. Tap the text or times to edit it in place; tap the Tag to change it.
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
}`,signature:{properties:[{key:`activity_ids`,value:{name:`Array`,elements:[{name:`string`}],raw:`string[]`,required:!1},description:`The Entry's Activities (0 to 3), oldest first`}]}}]},description:``},category:{required:!1,tsType:{name:`Pick`,elements:[{name:`signature['Tables']['categories']['Row']`,raw:`Tables['categories']['Row']`},{name:`union`,raw:`'id' | 'name' | 'description' | 'status'`,elements:[{name:`literal`,value:`'id'`},{name:`literal`,value:`'name'`},{name:`literal`,value:`'description'`},{name:`literal`,value:`'status'`}]}],raw:`Pick<Tables['categories']['Row'], 'id' | 'name' | 'description' | 'status'>`},description:``},activities:{required:!1,tsType:{name:`unknown`},description:`Shown after the text as "A · B" when the Entry has any.`,defaultValue:{value:`[]`,computed:!1}},timeZone:{required:!0,tsType:{name:`string`},description:``},onEdit:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onTag:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(opener: HTMLElement) => void`,signature:{arguments:[{type:{name:`HTMLElement`},name:`opener`}],return:{name:`void`}}},description:``}}}})))()}function Se({entry:e,categories:t,online:n,onPick:r,onClose:i,returnFocusTo:a}){let o=(0,F.useRef)(null),[s,c]=(0,F.useState)(),[l,u]=(0,F.useState)(!1),d=t.filter(e=>e.status===`active`);(0,F.useEffect)(()=>(o.current?.querySelector(`button`)?.focus(),()=>a?.focus()),[a]);let f=e=>{if(e.key===`Escape`){i();return}if(e.key!==`Tab`)return;let t=[...o.current?.querySelectorAll(`button:not(:disabled)`)??[]];if(t.length===0)return;let n=t[0],r=t[t.length-1];e.shiftKey&&document.activeElement===n?(e.preventDefault(),r.focus()):!e.shiftKey&&document.activeElement===r&&(e.preventDefault(),n.focus())},p=async e=>{if(l)return;if(!n){c(`Needs a connection.`);return}u(!0),c(void 0);let t=await r(e);u(!1),t.ok||t.error===`entry_not_found`||t.error===`session_lost`?i():c(t.error===`category_not_active`?`Pick another category.`:t.error===`unknown`?`Needs a connection.`:`Couldn't save. Try again.`)};return(0,I.jsx)(`div`,{className:`sheet-backdrop`,onClick:i,children:(0,I.jsxs)(`div`,{ref:o,className:`sheet`,role:`dialog`,"aria-modal":`true`,"aria-label":`Category for ${e.text}`,onClick:e=>e.stopPropagation(),onKeyDown:f,children:[(0,I.jsx)(`strong`,{children:e.text}),(0,I.jsx)(`ul`,{children:d.map(t=>(0,I.jsx)(`li`,{children:(0,I.jsxs)(`button`,{onClick:()=>void p(t.id),disabled:l,children:[(0,I.jsx)(`span`,{className:`dot`,style:{background:ee(t.name)}}),t.name,t.id===e.category_id?` ✓`:``]})},t.id))}),s&&(0,I.jsx)(`p`,{className:`error`,role:`alert`,children:s}),(0,I.jsx)(`button`,{className:`secondary`,onClick:i,disabled:l,children:`Cancel`})]})})}var F,I;function Ce(){return(Ce=e((()=>{F=n(),m(),I=r(),Se.__docgenInfo={description:`Sheet to change an Entry's Tag. Active Categories only (AC-4.1). It traps focus, Escape closes it,
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
}`,signature:{properties:[{key:`activity_ids`,value:{name:`Array`,elements:[{name:`string`}],raw:`string[]`,required:!1},description:`The Entry's Activities (0 to 3), oldest first`}]}}]},{name:`union`,raw:`'text' | 'category_id'`,elements:[{name:`literal`,value:`'text'`},{name:`literal`,value:`'category_id'`}]}],raw:`Pick<EntryRow, 'text' | 'category_id'>`},description:``},categories:{required:!0,tsType:{name:`unknown`},description:``},online:{required:!0,tsType:{name:`boolean`},description:``},onPick:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(categoryId: string) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`string`},name:`categoryId`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}}},description:``},onClose:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},returnFocusTo:{required:!1,tsType:{name:`union`,raw:`HTMLElement | null`,elements:[{name:`HTMLElement`},{name:`null`}]},description:``}}}})))()}function we({date:e,timeZone:t,now:n,entries:r,known:i=r,categories:a,activities:o=[],slots:l=[],refreshedAt:p,connection:m=`online`,load:h=`ready`,actions:_,onPickDay:re,onRetry:se,initialSheet:ce,initialText:le,initialEditId:ue,initialPickerId:de}){let[y,b]=(0,L.useState)(ce?{mode:ce,opener:null}:null),[x,pe]=(0,L.useState)(!1),[C,w]=(0,L.useState)(ue),[ge,_e]=(0,L.useState)(de?{id:de,opener:null}:void 0),[T,E]=(0,L.useState)(null),D=(0,L.useRef)(null);(0,L.useLayoutEffect)(()=>{T&&D.current?.scrollIntoView?.({block:`nearest`})},[T]),(0,L.useEffect)(()=>{if(!x)return;let e=setTimeout(()=>pe(!1),2e3);return()=>clearTimeout(e)},[x]);let O=(0,L.useMemo)(()=>{let t=t=>async(...n)=>{E(null);let r=await t(...n);return!r.ok&&r.error===`entry_not_found`&&E(e),r};return{createEntry:_.createEntry,editEntry:t(_.editEntry),deleteEntry:t(_.deleteEntry),setEntryTag:t(_.setEntryTag),setEntryActivities:_.setEntryActivities&&t(_.setEntryActivities)}},[_,e]),k=m!==`offline`,A=oe(n,t),j=e===A,M=d(v(e,t).start,t),N=(0,L.useMemo)(()=>v(e,t),[e,t]),ye=(0,L.useMemo)(()=>g(r,N,n),[r,N,n]),P=(0,L.useMemo)(()=>ne(r,N,n),[r,N,n]),xe=(0,L.useMemo)(()=>ie(r,N,n),[r,N,n]),F=(0,L.useMemo)(()=>[0,1,2,3,4,5,6].map(e=>{let i=ae(M,e),a=v(i,t);return{date:i,start:a.start,logged:ie(r,a,n),span:a.end-a.start}}),[M,t,r,n]),I=(0,L.useMemo)(()=>new Map(a.map(e=>[e.id,e])),[a]),Ce=(0,L.useMemo)(()=>new Map(o.map(e=>[e.id,e])),[o]),we=e=>[...new Set(e.activity_ids??[])].flatMap(e=>Ce.get(e)??[]),De=ge&&r.find(e=>e.id===ge.id),Oe=p?c(Date.parse(p),t):null,ke=N.end-N.start,z=e=>`${e/ke*100}%`,B=e=>{E(null),w(void 0),re(e)},V=d(n,t),H=y?(0,R.jsx)(fe,{mode:y.mode,day:e,entries:i,timeZone:t,now:n,connection:m,loading:h===`loading`,activities:o,slots:l,initialText:le,returnFocusTo:y.opener,onSave:O.createEntry,onSaved:()=>{b(null),pe(!0)},onClose:()=>b(null)},y.mode.kind===`now`?`now`:`fill:${y.mode.start}`):De?(0,R.jsx)(Se,{entry:De,categories:a,online:k,returnFocusTo:ge?.opener,onPick:e=>O.setEntryTag(De.id,e),onClose:()=>_e(void 0)}):void 0;return(0,R.jsxs)(me,{tab:`day`,busy:h===`loading`,overlay:H,fab:H?void 0:(0,R.jsx)(te,{onOpen:e=>b({mode:{kind:`now`},opener:e})}),children:[(0,R.jsx)(s,{state:m,refreshedAt:Oe}),(0,R.jsxs)(`header`,{className:`day-head`,children:[(0,R.jsxs)(`div`,{children:[(0,R.jsx)(`h1`,{children:j?`Today`:u(N.start,t,!0)}),(0,R.jsxs)(`p`,{className:`sub`,children:[j?`${u(N.start,t,!0)} · `:``,`week of `,Ee(M,t)]})]}),(0,R.jsxs)(`div`,{className:`wnav`,role:`group`,"aria-label":`Choose week`,children:[!j&&(0,R.jsx)(`button`,{className:`today-btn`,onClick:()=>B(A),children:`Today`}),(0,R.jsx)(`button`,{className:`icon-btn`,"aria-label":`Previous week`,onClick:()=>B(ae(e,-7)),children:(0,R.jsx)(Te,{left:!0})}),(0,R.jsx)(`button`,{className:`icon-btn`,"aria-label":`Next week`,disabled:M>=V,onClick:()=>{let t=ae(e,7);B(t>A?A:t)},children:(0,R.jsx)(Te,{})})]})]}),(0,R.jsx)(`nav`,{className:`strip`,"aria-label":`Days of the week`,children:F.map(n=>(0,R.jsxs)(`button`,{disabled:n.date>A,"aria-current":n.date===e?`date`:void 0,className:n.date===A?`today`:void 0,onClick:()=>B(n.date),children:[(0,R.jsx)(`span`,{children:new Intl.DateTimeFormat(`en-GB`,{timeZone:t,weekday:`short`}).format(n.start)}),` `,(0,R.jsx)(`b`,{children:new Intl.DateTimeFormat(`en-GB`,{timeZone:t,day:`numeric`}).format(n.start)}),` `,(0,R.jsxs)(`span`,{className:`sr-only`,children:[new Intl.DateTimeFormat(`en-GB`,{timeZone:t,month:`short`}).format(n.start),n.date>A?``:`, ${f(n.logged)} logged`]}),(0,R.jsx)(`span`,{className:`fill`,children:(0,R.jsx)(`span`,{style:{width:`${Math.min(n.logged/n.span,1)*100}%`}})})]},n.date))}),T===e&&(0,R.jsx)(`p`,{ref:D,className:`error notice`,role:`alert`,children:`This Entry was deleted.`}),(0,R.jsx)(`p`,{className:`status day-status`,"aria-live":`polite`,children:x?`Saved.`:``}),h===`loading`&&(0,R.jsx)(R.Fragment,{children:[1,2,3,4].map(e=>(0,R.jsx)(S,{style:{margin:`10px 0`}},e))}),h===`offline-earlier-week`&&(0,R.jsxs)(`div`,{className:`empty`,children:[`Earlier days need a connection.`,(0,R.jsx)(`div`,{children:(0,R.jsx)(`button`,{className:`secondary`,style:{marginTop:12},onClick:se,children:`Retry`})})]}),h===`session-lost-earlier-week`&&(0,R.jsx)(`div`,{className:`empty`,children:`Sign in to see earlier days.`}),h===`ready`&&(0,R.jsxs)(R.Fragment,{children:[(0,R.jsx)(`div`,{className:`cover`,role:`img`,"aria-label":`Logged ${f(xe)} of the day`,children:P.map(e=>{let t=e.categoryId?I.get(e.categoryId):void 0;return(0,R.jsx)(`span`,{style:{left:z(e.start-N.start),width:z(e.end-e.start),background:t?ee(t.name):`var(--neutral-bar)`}},e.start)})}),(0,R.jsxs)(`div`,{className:`axis`,"aria-hidden":`true`,children:[(0,R.jsx)(`span`,{children:`00`}),(0,R.jsx)(`span`,{children:`06`}),(0,R.jsx)(`span`,{children:`12`}),(0,R.jsx)(`span`,{children:`18`}),(0,R.jsx)(`span`,{children:`24`})]}),(0,R.jsxs)(`div`,{className:`day-sum`,children:[(0,R.jsxs)(`span`,{children:[`Logged `,f(xe)]}),(0,R.jsx)(he,{time:Oe})]}),(0,R.jsx)(`section`,{className:`day-list`,"aria-label":`Entries on ${u(N.start,t,!0)}`,children:ye.map(i=>{if(i.kind===`slot`){let r=ye.length===1,a=i.end===n?`now`:i.end===N.end?`24:00`:c(i.end,t);return(0,R.jsxs)(`div`,{className:`slot`,children:[!r&&(0,R.jsxs)(`span`,{className:`when`,children:[c(i.start,t),`–`,a]}),(0,R.jsx)(`span`,{className:`what`,children:r?`Nothing logged`:`${f(i.end-i.start)} unlogged`}),(0,R.jsx)(`button`,{className:`link`,"aria-label":`Fill ${c(i.start,t)}–${a}`,onClick:t=>b({mode:{kind:`fill`,start:i.start,end:i.end,day:e},opener:t.currentTarget}),children:`Fill`})]},`slot-${i.start}`)}let a=i.entry;return a.id===C?(0,R.jsx)(ve,{entry:a,siblings:r,now:n,timeZone:t,online:k,activities:o,activityNames:we(a).map(e=>e.name),onSetActivities:O.setEntryActivities&&(e=>O.setEntryActivities(a.id,e)),onSave:e=>O.editEntry(a.id,e),onDelete:()=>O.deleteEntry(a.id),onClose:()=>w(void 0)},a.id):(0,R.jsx)(be,{entry:a,category:a.category_id?I.get(a.category_id):void 0,activities:we(a),timeZone:t,onEdit:()=>w(a.id),onTag:e=>_e({id:a.id,opener:e})},a.id)})})]})]})}var L,R,Te,Ee;function De(){return(De=e((()=>{L=n(),i(),o(),a(),de(),h(),ye(),xe(),l(),y(),ue(),C(),w(),se(),Ce(),b(),ge(),m(),R=r(),Te=({left:e})=>(0,R.jsx)(`svg`,{width:`18`,height:`18`,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,strokeWidth:`2.4`,strokeLinecap:`round`,strokeLinejoin:`round`,"aria-hidden":`true`,children:(0,R.jsx)(`path`,{d:e?`M15 5l-7 7 7 7`:`M9 5l7 7-7 7`})}),Ee=(e,t)=>{let n=v(e,t).start,r=v(ae(e,6),t).start,i=e=>new Intl.DateTimeFormat(`en-GB`,{timeZone:t,month:`short`}).format(e),a=e=>new Intl.DateTimeFormat(`en-GB`,{timeZone:t,day:`numeric`}).format(e);return i(n)===i(r)?`${i(n)} ${a(n)}–${a(r)}`:`${i(n)} ${a(n)} – ${i(r)} ${a(r)}`},we.__docgenInfo={description:`The Day view (05-ui D5, AC-1.4): a week strip to pick the day, the day's coverage, its Entries in order with
Unlogged slots to Fill, inline edit and Tag, and a floating + to log now.`,methods:[],displayName:`DayView`,props:{date:{required:!0,tsType:{name:`string`},description:"The day shown, `YYYY-MM-DD`."},timeZone:{required:!0,tsType:{name:`string`},description:``},now:{required:!0,tsType:{name:`number`},description:``},entries:{required:!0,tsType:{name:`unknown`},description:`Entries that touch the day's week (for the strip and the list).`},known:{required:!1,tsType:{name:`unknown`},description:`Every Entry known on the phone, for the Log sheet's prefill, Recent chips and overlap check.`,defaultValue:{value:`entries`,computed:!1}},categories:{required:!0,tsType:{name:`unknown`},description:``},activities:{required:!1,tsType:{name:`unknown`},description:`All of mine, Active and merged, and the slot counts for the Log sheet's chips.`,defaultValue:{value:`[]`,computed:!1}},slots:{required:!1,tsType:{name:`unknown`},description:``,defaultValue:{value:`[]`,computed:!1}},refreshedAt:{required:!0,tsType:{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},description:`ISO time of the last Local copy refresh; null = never.`},connection:{required:!1,tsType:{name:`union`,raw:`'online' | 'offline' | 'signed-out'`,elements:[{name:`literal`,value:`'online'`},{name:`literal`,value:`'offline'`},{name:`literal`,value:`'signed-out'`}]},description:``,defaultValue:{value:`'online'`,computed:!1}},load:{required:!1,tsType:{name:`union`,raw:`'ready' | 'loading' | 'offline-earlier-week' | 'session-lost-earlier-week'`,elements:[{name:`literal`,value:`'ready'`},{name:`literal`,value:`'loading'`},{name:`literal`,value:`'offline-earlier-week'`},{name:`literal`,value:`'session-lost-earlier-week'`}]},description:``,defaultValue:{value:`'ready'`,computed:!1}},actions:{required:!0,tsType:{name:`signature`,type:`object`,raw:`{
  createEntry: (entry: NewEntry) => Promise<Result<unknown>>;
  editEntry: (id: string, fields: EntryFields) => Promise<Result<unknown>>;
  deleteEntry: (id: string) => Promise<Result<unknown>>;
  setEntryTag: (entryId: string, categoryId: string) => Promise<Result<unknown>>;
  /** Replaces the Entry's Activities (0 to 3 names; empty clears). Without it the editor has no Activity picker. */
  setEntryActivities?: (entryId: string, names: string[]) => Promise<Result<unknown>>;
}`,signature:{properties:[{key:`createEntry`,value:{name:`signature`,type:`function`,raw:`(entry: NewEntry) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`intersection`,raw:`EntryFields & Pick<Tables['entries']['Row'], 'id' | 'form_opened_at'>`,elements:[{name:`Pick`,elements:[{name:`signature['Tables']['entries']['Row']`,raw:`Tables['entries']['Row']`},{name:`union`,raw:`'text' | 'started_at' | 'ended_at' | 'time_zone'`,elements:[{name:`literal`,value:`'text'`},{name:`literal`,value:`'started_at'`},{name:`literal`,value:`'ended_at'`},{name:`literal`,value:`'time_zone'`}]}],raw:`Pick<Tables['entries']['Row'], 'text' | 'started_at' | 'ended_at' | 'time_zone'>`},{name:`Pick`,elements:[{name:`signature['Tables']['entries']['Row']`,raw:`Tables['entries']['Row']`},{name:`union`,raw:`'id' | 'form_opened_at'`,elements:[{name:`literal`,value:`'id'`},{name:`literal`,value:`'form_opened_at'`}]}],raw:`Pick<Tables['entries']['Row'], 'id' | 'form_opened_at'>`}]},name:`entry`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}},required:!0}},{key:`editEntry`,value:{name:`signature`,type:`function`,raw:`(id: string, fields: EntryFields) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`string`},name:`id`},{type:{name:`Pick`,elements:[{name:`signature['Tables']['entries']['Row']`,raw:`Tables['entries']['Row']`},{name:`union`,raw:`'text' | 'started_at' | 'ended_at' | 'time_zone'`,elements:[{name:`literal`,value:`'text'`},{name:`literal`,value:`'started_at'`},{name:`literal`,value:`'ended_at'`},{name:`literal`,value:`'time_zone'`}]}],raw:`Pick<Tables['entries']['Row'], 'text' | 'started_at' | 'ended_at' | 'time_zone'>`},name:`fields`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}},required:!0}},{key:`deleteEntry`,value:{name:`signature`,type:`function`,raw:`(id: string) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`string`},name:`id`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}},required:!0}},{key:`setEntryTag`,value:{name:`signature`,type:`function`,raw:`(entryId: string, categoryId: string) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`string`},name:`entryId`},{type:{name:`string`},name:`categoryId`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}},required:!0}},{key:`setEntryActivities`,value:{name:`signature`,type:`function`,raw:`(entryId: string, names: string[]) => Promise<Result<unknown>>`,signature:{arguments:[{type:{name:`string`},name:`entryId`},{type:{name:`Array`,elements:[{name:`string`}],raw:`string[]`},name:`names`}],return:{name:`Promise`,elements:[{name:`union`,raw:`{ ok: true; data: T } | { ok: false; error: ErrorKey }`,elements:[{name:`signature`,type:`object`,raw:`{ ok: true; data: T }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`true`,required:!0}},{key:`data`,value:{name:`unknown`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ ok: false; error: ErrorKey }`,signature:{properties:[{key:`ok`,value:{name:`literal`,value:`false`,required:!0}},{key:`error`,value:{name:`union`,raw:`ValidationKey | 'unknown' | 'session_lost' | 'server' | 'too_soon' | 'week_not_allowed'`,elements:[{name:`unknown[number]`,raw:`(typeof VALIDATION_KEYS)[number]`},{name:`literal`,value:`'unknown'`},{name:`literal`,value:`'session_lost'`},{name:`literal`,value:`'server'`},{name:`literal`,value:`'too_soon'`},{name:`literal`,value:`'week_not_allowed'`}],required:!0}}]}}]}],raw:`Promise<Result<unknown>>`}},required:!1},description:`Replaces the Entry's Activities (0 to 3 names; empty clears). Without it the editor has no Activity picker.`}]}},description:``},onPickDay:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(date: string) => void`,signature:{arguments:[{type:{name:`string`},name:`date`}],return:{name:`void`}}},description:``},onRetry:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},initialSheet:{required:!1,tsType:{name:`union`,raw:`{ kind: 'now' } | { kind: 'fill'; start: number; end: number; day: string }`,elements:[{name:`signature`,type:`object`,raw:`{ kind: 'now' }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`'now'`,required:!0}}]}},{name:`signature`,type:`object`,raw:`{ kind: 'fill'; start: number; end: number; day: string }`,signature:{properties:[{key:`kind`,value:{name:`literal`,value:`'fill'`,required:!0}},{key:`start`,value:{name:`number`,required:!0}},{key:`end`,value:{name:`number`,required:!0}},{key:`day`,value:{name:`string`,required:!0}}]}}]},description:`Start with a sheet, editor or Tag picker open (stories, Nudge).`},initialText:{required:!1,tsType:{name:`string`},description:``},initialEditId:{required:!1,tsType:{name:`string`},description:``},initialPickerId:{required:!1,tsType:{name:`string`},description:``}}}})))()}var Oe=t({EarlierDayOffline:()=>Be,EarlierDaySignedOut:()=>Ve,EditActivity:()=>Ze,EditActivityAdding:()=>et,EditActivityBlank:()=>Xe,EditActivityFull:()=>$e,EditActivityTooLong:()=>Ye,EditInline:()=>Le,EmptyDay:()=>K,Fill:()=>X,FillFails:()=>Z,Loading:()=>ze,LogNow:()=>q,LogNowActivityChips:()=>Ke,LogNowPastDay:()=>Y,LogNowTyping:()=>J,LongList:()=>Ue,Offline:()=>Q,PastDay:()=>G,SignedOut:()=>We,TagPickerOpen:()=>Re,Today:()=>W,WithActivities:()=>Ge,__namedExportsOrder:()=>tt,default:()=>Ie}),ke,z,B,V,H,Ae,je,Me,Ne,U,Pe,Fe,Ie,W,G,K,q,J,Y,X,Z,Le,Re,ze,Be,Ve,He,Ue,Q,We,$,Ge,Ke,qe,Je,Ye,Xe,Ze,Qe,$e,et,tt;function nt(){return(nt=e((()=>{De(),{expect:ke}=__STORYBOOK_MODULE_TEST__,z=(e,t)=>({id:e,name:t,description:t,status:`active`}),B=[z(`deep`,`Deep`),z(`shallow`,`Shallow`),z(`maintenance`,`Maintenance`),z(`recovery`,`Recovery`),z(`waste`,`Waste`)],V=(e,t,n,r,i,a)=>({id:e,text:n,started_at:`2026-11-${t}T${r}:00Z`,ended_at:`2026-11-${t}T${i}:00Z`,created_at:`2026-11-${t}T${i}:00Z`,time_zone:`UTC`,category_id:a,tag_source:a?`ai`:null,suggested_category_id:null,tagging_gave_up_at:null}),H=[V(`m1`,`09`,`Planning`,`16:00`,`18:00`,`deep`),V(`m2`,`09`,`Dinner`,`18:00`,`19:00`,`recovery`),V(`t1`,`10`,`Email triage`,`07:00`,`08:00`,`shallow`),V(`t2`,`10`,`Wrote design doc`,`08:00`,`10:00`,`deep`),V(`t3`,`10`,`Standup`,`10:00`,`10:15`,null),V(`t4`,`10`,`Lunch walk`,`11:45`,`12:45`,`recovery`),{...V(`t5`,`10`,`Parking permit`,`12:45`,`13:05`,null),tagging_gave_up_at:`2026-11-10T13:30:00Z`},V(`t6`,`10`,`Code review`,`13:05`,`14:25`,`deep`)],Ae=[{id:`ca`,name:`Company A`,status:`active`,merged_into_id:null},{id:`lu`,name:`Lunch`,status:`active`,merged_into_id:null},{id:`sp`,name:`Side project`,status:`active`,merged_into_id:null}],je={t1:[`ca`],t2:[`ca`,`sp`],t4:[`lu`],t6:[`ca`],m1:[`sp`]},Me=H.map(e=>({...e,activity_ids:je[e.id]??[]})),Ne=[{activity_id:`ca`,dow:2,hour:14,n:6},{activity_id:`lu`,dow:2,hour:14,n:3},{activity_id:`sp`,dow:1,hour:20,n:2}],U=(e={ok:!0,data:null})=>()=>new Promise(t=>setTimeout(()=>t(e),600)),Pe={createEntry:U(),editEntry:U(),deleteEntry:U(),setEntryTag:U(),setEntryActivities:U()},Fe=e=>Date.parse(e),Ie={title:`Screens/1 Day`,component:we,args:{date:`2026-11-10`,timeZone:`UTC`,now:Fe(`2026-11-10T14:35:00Z`),entries:H,categories:B,refreshedAt:`2026-11-10T14:30:00Z`,actions:Pe,onPickDay:()=>{}},parameters:{docs:{description:{component:`The home screen (05-ui D5): a week strip, the day's coverage, its Entries with Unlogged slots to Fill, and a floating + to log now. Tap + or Fill to try the mock save.`}}}},W={},G={name:`Past day (Mon 9)`,args:{date:`2026-11-09`}},K={name:`Nothing logged`,args:{date:`2026-11-09`,entries:H.filter(e=>!e.id.startsWith(`m`))}},q={name:`Log now (+)`,args:{initialSheet:{kind:`now`}}},J={name:`Log now: typing`,args:{initialSheet:{kind:`now`},initialText:`Reading PR reviews`}},Y={name:`Log now on a past day (Mon 9)`,args:{date:`2026-11-09`,initialSheet:{kind:`now`}}},X={name:`Fill a slot (Mon 9, 19:00–23:30)`,args:{date:`2026-11-09`,entries:[...H,V(`m3`,`09`,`Late call`,`23:30`,`23:50`,`shallow`)],initialSheet:{kind:`fill`,start:Fe(`2026-11-09T19:00:00Z`),end:Fe(`2026-11-09T23:30:00Z`),day:`2026-11-09`},initialText:`Reading`}},Z={name:`Fill: save fails`,args:{...X.args,actions:{...Pe,createEntry:U({ok:!1,error:`unknown`})}},parameters:{docs:{description:{story:`Tap Save to see "Needs a connection."; the text stays.`}}}},Le={name:`Edit an Entry inline`,args:{initialEditId:`t2`}},Re={name:`Change a Tag`,args:{initialPickerId:`t3`}},ze={args:{load:`loading`,refreshedAt:null}},Be={name:`Earlier day: offline`,args:{date:`2026-10-21`,entries:[],load:`offline-earlier-week`,connection:`offline`}},Ve={name:`Earlier day: signed out`,args:{date:`2026-10-21`,entries:[],load:`session-lost-earlier-week`,connection:`signed-out`}},He=Array.from({length:14},(e,t)=>{let n=String(t+7).padStart(2,`0`);return V(`l${t}`,`10`,`Block ${t+1}`,`${n}:00`,`${n}:50`,t%3?`deep`:`shallow`)}),Ue={name:`Long list (scrolled to the bottom)`,args:{entries:He,now:Fe(`2026-11-10T23:55:00Z`)},parameters:{docs:{description:{story:`Scrolled to the end, the last row sits fully above the + (issue #70).`}}},play:async({canvasElement:e})=>{let t=e.querySelector(`.phone-body`);t.scrollTop=t.scrollHeight,await new Promise(e=>setTimeout(e,300));let n=t.querySelectorAll(`.entry`),r=n[n.length-1].getBoundingClientRect(),i=e.querySelector(`.fab-dock`).getBoundingClientRect(),a=e.querySelector(`.fab`),o=i.top-a.offsetHeight-parseFloat(getComputedStyle(a).bottom);await ke(r.bottom).toBeLessThanOrEqual(o)}},Q={args:{connection:`offline`}},We={args:{connection:`signed-out`}},$={entries:Me,activities:Ae,slots:Ne},Ge={name:`With Activities: shown on each Entry`,args:$},Ke={name:`With Activities: Log now chips`,args:{...$,initialSheet:{kind:`now`}}},qe=e=>({...Pe,editEntry:()=>Promise.resolve({ok:!0,data:null}),setEntryActivities:()=>Promise.resolve({ok:!1,error:e})}),Je=async({canvasElement:e})=>{await new Promise(e=>setTimeout(e,100)),[...e.querySelectorAll(`.activity-picker button`)].find(e=>e.textContent===`+ Add`)?.click(),await new Promise(e=>setTimeout(e,50));let t=e.querySelector(`.activity-picker input`);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,`value`).set.call(t,`Side project`),t.dispatchEvent(new Event(`input`,{bubbles:!0})),await new Promise(e=>setTimeout(e,50)),[...e.querySelectorAll(`.activity-picker .row-actions button`)].find(e=>e.textContent===`Add`)?.click(),await new Promise(e=>setTimeout(e,50)),[...e.querySelectorAll(`.entry-edit .row-actions button`)].find(e=>e.textContent===`Save`)?.click(),await new Promise(e=>setTimeout(e,100))},Ye={name:`With Activities: edit refused, name too long`,args:{...$,initialEditId:`t2`,actions:qe(`activity_name_too_long`)},play:Je},Xe={name:`With Activities: edit refused, name blank`,args:{...$,initialEditId:`t2`,actions:qe(`activity_name_blank`)},play:Je},Ze={name:`With Activities: edit an Entry with two Activities`,args:{...$,initialEditId:`t2`}},Qe=Me.map(e=>e.id===`t2`?{...e,activity_ids:[`ca`,`lu`,`sp`]}:e),$e={name:`With Activities: edit an Entry at 3 (no + Add)`,args:{...$,entries:Qe,initialEditId:`t2`}},et={name:`With Activities: adding one`,args:{...$,initialEditId:`t1`},play:async({canvasElement:e})=>{await new Promise(e=>setTimeout(e,100)),[...e.querySelectorAll(`.activity-picker button`)].find(e=>e.textContent===`+ Add`)?.click(),await new Promise(e=>setTimeout(e,100))}},tt=[`Today`,`PastDay`,`EmptyDay`,`LogNow`,`LogNowTyping`,`LogNowPastDay`,`Fill`,`FillFails`,`EditInline`,`TagPickerOpen`,`Loading`,`EarlierDayOffline`,`EarlierDaySignedOut`,`LongList`,`Offline`,`SignedOut`,`WithActivities`,`LogNowActivityChips`,`EditActivityTooLong`,`EditActivityBlank`,`EditActivity`,`EditActivityFull`,`EditActivityAdding`],W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`{}`,...W.parameters?.docs?.source}}},G.parameters={...G.parameters,docs:{...G.parameters?.docs,source:{originalSource:`{
  name: 'Past day (Mon 9)',
  args: {
    date: '2026-11-09'
  }
}`,...G.parameters?.docs?.source}}},K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`{
  name: 'Nothing logged',
  args: {
    date: '2026-11-09',
    entries: entries.filter(e => !e.id.startsWith('m'))
  }
}`,...K.parameters?.docs?.source}}},q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`{
  name: 'Log now (+)',
  args: {
    initialSheet: {
      kind: 'now'
    }
  }
}`,...q.parameters?.docs?.source}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`{
  name: 'Log now: typing',
  args: {
    initialSheet: {
      kind: 'now'
    },
    initialText: 'Reading PR reviews'
  }
}`,...J.parameters?.docs?.source}}},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
  name: 'Log now on a past day (Mon 9)',
  args: {
    date: '2026-11-09',
    initialSheet: {
      kind: 'now'
    }
  }
}`,...Y.parameters?.docs?.source}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
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
}`,...X.parameters?.docs?.source}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
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
}`,...Z.parameters?.docs?.source}}},Le.parameters={...Le.parameters,docs:{...Le.parameters?.docs,source:{originalSource:`{
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
}`,...Ue.parameters?.docs?.source}}},Q.parameters={...Q.parameters,docs:{...Q.parameters?.docs,source:{originalSource:`{
  args: {
    connection: 'offline'
  }
}`,...Q.parameters?.docs?.source}}},We.parameters={...We.parameters,docs:{...We.parameters?.docs,source:{originalSource:`{
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
}`,...$e.parameters?.docs?.source}}},et.parameters={...et.parameters,docs:{...et.parameters?.docs,source:{originalSource:`{
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
}`,...et.parameters?.docs?.source}}}})))()}export{nt as n,Oe as t};