(function(){
 const status=document.getElementById('status'),reset=document.getElementById('reset');
 reset.addEventListener('click',()=>{try{const count=FatFishLocalReset.reset(localStorage);status.textContent='已重置 '+count+' 项本机游戏记录，备份已保存。返回游戏即可从初始状态体验。';status.dataset.complete='true';reset.disabled=true;}catch(error){status.textContent=error.message;}});
 document.getElementById('restore').addEventListener('click',()=>{try{const at=FatFishLocalReset.restore(localStorage);status.textContent='已恢复 '+new Date(at).toLocaleString()+' 的备份。请重新打开游戏。';reset.disabled=false;}catch(error){status.textContent=error.message;}});
})();
