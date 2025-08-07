let input = document.querySelector('#text1');
let container = document.querySelector('.container');
let submit1 = document.querySelector('#submit1');

let Arrays = [];

if(localStorage.getItem('tasks')){
   Arrays = JSON.parse(localStorage.getItem('tasks'));
} 

GetItem();

container.addEventListener('click',function(event){
   if(event.target.tagName == 'SPAN'){
    deletediv(event.target.parentElement.getAttribute('data'))
    event.target.parentElement.remove();
   }
   if(event.target.tagName == 'DIV'){ 
    toggle(event.target.getAttribute('data'));
      event.target.classList.toggle('done');
   }
})

function toggle(taskId1){
    for(let i = 0; i < Arrays.length;i++){
        if(Arrays[i].id == taskId1){
            Arrays[i].completed == false ? (Arrays[i].completed = true) : (Arrays[i].completed = false)
            addstorig(Arrays);
        }
    }   
}

function deletediv(taskId){
    for(let i = 0; i < Arrays.length;i++){
        if(Arrays[i].id == taskId){
           Arrays = Arrays.filter(task => task.id != taskId)
           addstorig(Arrays);
        }

    }
}

submit1.addEventListener('click',function(){
    if(input.value != ''){
     addArray(input.value);
     input.value = ''; 
    }
})

function addArray(ma3loma){
   const task = {
     id : Date.now(),
     title : ma3loma,
     completed : false,
     time : Date.now(),
   }
   Arrays.push(task);
   addelement(Arrays);
   addstorig(Arrays);
} 

function addelement(Arrays){
    container.innerHTML = '';
    const now = Date.now();
    console.log(now)
   Arrays.forEach(task => {
     let div = document.createElement('div')
     div.className = 'div1'
     div.tagName = 'DIV'
     div.setAttribute('data',task.id)
     div.appendChild(document.createTextNode(task.title))
     if(task.completed){
         div.className = 'div1 done'
     }
     let span = document.createElement('span')
     span.classname = 'span'
     span.tagname = 'SPAN'
     span.style.marginLeft = '30px' 
     span.style.background = 'gainsboro'
     span.style.padding = '8px'
     span.style.borderRadius = '20px'
     span.style.cursor =  'pointer'
     span.appendChild(document.createTextNode('Delete'))
     div.addEventListener('click',function(event){
        if(event.target.tagName == 'DIV' ){
            editTask(this,span,event.target.getAttribute('data'));

        }else if(event.target.tagName == 'SPAN'){
            console.log('younes');
        }
     })

    let timepassed = now - task.time; 
    let oneday = 1 * 60 * 1000;
    let twoday = 2 * 60 * 1000;
    let div2 = document.createElement('div');
    if(timepassed >= oneday){
        div2.appendChild(document.createTextNode('اليوم '))
        div2.style.color = 'black'
        div2.style.position = 'relative'
        div2.style.top = '-20px'
        div2.style.right = '-100px'
        div.appendChild(div2);
    }
    if(timepassed >= twoday){
        div2.innerText = 'يومين'
        console.log('younessasassssss')
        addstorig(Arrays);

    }
    div.appendChild(span);
    container.appendChild(div);
   });
}
setTimeout(() => {
    location.reload();
}, 30000);
function editTask(editdiv,span,taskId1){
    const edittask = document.createElement('input');
    edittask.type = 'text'
    editdiv.appendChild(document.createTextNode(edittask.value))
    edittask.className = 'edit'

    editdiv.replaceWith(edittask);
    edittask.focus();

    edittask.addEventListener('keypress',function(event){
        if(event.key === 'Enter'){
            saveEdit(edittask,editdiv);
            edit(edittask,taskId1);
        }
    })
    function saveEdit(edittask, editdiv){

        if(edittask.value.trim() !== ''){
            editdiv.innerText = edittask.value;
            editdiv.appendChild(span);
        }
        edittask.replaceWith(editdiv);  
    };
}

function addstorig(Arrays){
  localStorage.setItem('tasks', JSON.stringify(Arrays))
}

function GetItem(){
    let data = localStorage.getItem('tasks');
    if(data){
       let tasks = JSON.parse(data);
       addelement(tasks);
    }
} 

function edit(edittask,taskId1){
    for(let i = 0 ; i < Arrays.length ; i++){
        if(Arrays[i].id == taskId1){
            Arrays[i].title = edittask.value;
        }
    }
    addstorig(Arrays);

}
