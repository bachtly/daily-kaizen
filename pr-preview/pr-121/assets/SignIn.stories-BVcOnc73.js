import{n as e,r as t}from"./rolldown-runtime-sJBDdmOt.js";import{t as n}from"./react-DlPsW1c0.js";import{t as r}from"./jsx-runtime-MKhVqBIO.js";import{c as i,n as a,t as o}from"./Phone-0YEjtkJY.js";import{t as s}from"./auth-CXoAG8tb.js";function c({step:e=`email`,email:t=``,busy:n,error:r,installLink:i,resendWaitSeconds:a=0,onEmailChange:s,onCodeChange:c,onSendCode:d,onVerify:f}){return(0,l.jsxs)(o,{children:[(0,l.jsx)(`h1`,{children:`daily-kaizen`}),(0,l.jsxs)(`form`,{onSubmit:(e=>t=>{t.preventDefault(),e?.()})(e===`email`?d:f),children:[(0,l.jsx)(`label`,{className:`field-label`,htmlFor:`email`,children:`Email`}),(0,l.jsx)(`input`,{id:`email`,className:`text`,type:`email`,autoComplete:`email`,required:!0,...s?{value:t,onChange:e=>s(e.target.value)}:{defaultValue:t},readOnly:e===`code`}),e===`email`&&(0,l.jsxs)(l.Fragment,{children:[r&&(0,l.jsx)(`p`,{className:`error`,role:`alert`,children:u[r]}),(0,l.jsx)(`button`,{className:`primary`,type:`submit`,disabled:n,children:n?`Sending…`:`Send code`})]}),e===`code`&&(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)(`p`,{className:`note`,role:`status`,children:`A 6-digit code is on its way.`}),(0,l.jsx)(`label`,{className:`field-label`,htmlFor:`code`,style:{marginTop:16},children:`Code`}),(0,l.jsx)(`input`,{id:`code`,className:`text code`,inputMode:`numeric`,autoComplete:`one-time-code`,maxLength:6,placeholder:`______`,"aria-invalid":r===`wrong-code`,onChange:c?e=>c(e.target.value.replace(/\D/g,``)):void 0}),r&&(0,l.jsx)(`p`,{className:`error`,role:`alert`,children:u[r]}),(0,l.jsx)(`button`,{className:`primary`,type:`submit`,disabled:n,children:n?`Signing in…`:`Sign in`}),(0,l.jsx)(`div`,{className:`row-actions`,children:(0,l.jsx)(`button`,{className:`link`,type:`button`,disabled:a>0||n,onClick:d,children:a>0?`Send a new code in ${a}s`:`Send a new code`})})]})]}),i&&(0,l.jsxs)(`p`,{className:`note install-link`,children:[`Want Nudges and reminders? `,(0,l.jsx)(`a`,{href:`/install`,children:`Add it to your Home Screen`})]})]})}var l,u;function d(){return(d=e((()=>{n(),i(),s(),a(),l=r(),u={"wrong-code":`Wrong or expired code.`,"rate-limited":`Wait a moment, then send a new code.`,offline:`Needs a connection. Try again.`,server:`Couldn't sign in. Try again.`},c.__docgenInfo={description:`The Sign in screen, props only (UC-6). Works in any browser (AC-7.1). Any email gets a code; a new one gets a new account (AC-7.2).`,methods:[],displayName:`SignInView`,props:{step:{required:!1,tsType:{name:`union`,raw:`'email' | 'code'`,elements:[{name:`literal`,value:`'email'`},{name:`literal`,value:`'code'`}]},description:``,defaultValue:{value:`'email'`,computed:!1}},email:{required:!1,tsType:{name:`string`},description:``,defaultValue:{value:`''`,computed:!1}},busy:{required:!1,tsType:{name:`boolean`},description:``},error:{required:!1,tsType:{name:`union`,raw:`'wrong-code' | 'rate-limited' | 'offline' | 'server'`,elements:[{name:`literal`,value:`'wrong-code'`},{name:`literal`,value:`'rate-limited'`},{name:`literal`,value:`'offline'`},{name:`literal`,value:`'server'`}]},description:``},installLink:{required:!1,tsType:{name:`boolean`},description:`Opened in a browser, not the home-screen app: a link to the Add to Home Screen steps.`},resendWaitSeconds:{required:!1,tsType:{name:`number`},description:``,defaultValue:{value:`0`,computed:!1}},onEmailChange:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(email: string) => void`,signature:{arguments:[{type:{name:`string`},name:`email`}],return:{name:`void`}}},description:``},onCodeChange:{required:!1,tsType:{name:`signature`,type:`function`,raw:`(code: string) => void`,signature:{arguments:[{type:{name:`string`},name:`code`}],return:{name:`void`}}},description:``},onSendCode:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},onVerify:{required:!1,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``}}}})))()}var f=t({Code:()=>v,CodeResendReady:()=>y,Email:()=>m,InBrowser:()=>h,OfflineOnSend:()=>_,RateLimited:()=>x,Sending:()=>g,WrongCode:()=>b,__namedExportsOrder:()=>S,default:()=>p}),p,m,h,g,_,v,y,b,x,S;function C(){return(C=e((()=>{d(),p={title:`Screens/4 Sign in`,component:c},m={},h={name:`Email, in a browser`,args:{installLink:!0}},g={args:{email:`me@example.com`,busy:!0}},_={args:{email:`me@example.com`,error:`offline`}},v={args:{step:`code`,email:`me@example.com`,resendWaitSeconds:42}},y={args:{step:`code`,email:`me@example.com`}},b={args:{step:`code`,email:`me@example.com`,error:`wrong-code`}},x={args:{step:`code`,email:`me@example.com`,error:`rate-limited`}},S=[`Email`,`InBrowser`,`Sending`,`OfflineOnSend`,`Code`,`CodeResendReady`,`WrongCode`,`RateLimited`],m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  name: 'Email, in a browser',
  args: {
    installLink: true
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    email: 'me@example.com',
    busy: true
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    email: 'me@example.com',
    error: 'offline'
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    step: 'code',
    email: 'me@example.com',
    resendWaitSeconds: 42
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    step: 'code',
    email: 'me@example.com'
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    step: 'code',
    email: 'me@example.com',
    error: 'wrong-code'
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    step: 'code',
    email: 'me@example.com',
    error: 'rate-limited'
  }
}`,...x.parameters?.docs?.source}}}})))()}export{C as n,f as t};