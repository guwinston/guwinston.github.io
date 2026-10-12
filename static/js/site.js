const dialog=document.querySelector('#search-dialog');
document.querySelector('#search-open')?.addEventListener('click',()=>{dialog.showModal();document.querySelector('#search-input').focus();});
document.querySelector('#search-close')?.addEventListener('click',()=>dialog.close());
dialog?.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
let searchIndex;
let searchRevision=0;
document.querySelector('#search-input')?.addEventListener('input',async e=>{
 const revision=++searchRevision;const query=e.target.value.trim().toLocaleLowerCase();const results=document.querySelector('#search-results');
 results.replaceChildren();if(!query){results.textContent='输入关键词开始搜索。';return;}
 results.textContent='正在搜索…';
 try{if(!searchIndex){const response=await fetch(JSON.parse(document.querySelector('#search-config').textContent).url);if(!response.ok)throw new Error('search');searchIndex=await response.json();}if(revision!==searchRevision)return;
 const matches=searchIndex.filter(item=>[item.title,item.description,item.content,...(item.tags||[])].join(' ').toLocaleLowerCase().includes(query));results.replaceChildren();
 if(!matches.length)results.textContent='没有找到相关手记，试试其他关键词。';
 for(const item of matches){const link=document.createElement('a');link.className='search-result';link.href=item.url;const title=document.createElement('strong');title.textContent=item.title;const description=document.createElement('p');description.textContent=item.description;link.append(title,description);results.append(link);}
 }catch{if(revision===searchRevision)results.textContent='搜索暂时不可用，请稍后重试。';}
});
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
 document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
 let visible=0;document.querySelectorAll('[data-section]').forEach(entry=>{entry.hidden=button.dataset.filter!=='all'&&entry.dataset.section!==button.dataset.filter;if(!entry.hidden)visible++;});document.querySelector('#filter-empty').hidden=visible>0;
}));
