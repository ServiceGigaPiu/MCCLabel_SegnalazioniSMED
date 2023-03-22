/* ################################################################################################################################
   ################################ GENERAL PURPOSE / UTILS  ###################################################################### */
   //#region
   let ___GENERAL_PURPOSE__; //vscode outline-view category pseudo-title
   /** placeholder for optional function arguments that expect a function, ex. callbacks */
   const noOp = function (){};
   const noop = noOp; //ignore typos
   /**
    * sequentially push values of arr
    * @param {any[]} arr 
    */
   Array.prototype.seqPush = function (arr){
      for(let val of arr)
         this.push(val);
   }

   
   /**
    * @summary sequentially push provided values into arr1.
    * @param {any[]} arr1 array to push values into
    * @param {any | any[]} valOrArr values to push
    */
   function arrayAppend(arr1,valOrArr){
      if(typeof(valOrArr) == "array")
         for(let val of valOrArr)
            arr1.push(val);
      else
         arr1.push(val);
   }

   
   /**
    * @summary recursively merge two Objects
    * @desc overlay sec onto main. keeps properties of both. undefined properties of main are directly assigned from sec.
    * - ex: main : {a, b:b1} sec:{b:b2, c} -> res:{a , b:b2, c} where:
    * - -res.a===main.a
    * - -res.c===sec.c
    * - -res.b!==sec.b2
    * @param {Object} main 
    * @param {Object} sec 
    */
   function mergeRec(main, sec){
      for(let p in sec){
         //if(main[p]===undefined) //commented bcs implicitly included in the next if condition //(typeof(undefVar) <=> "undefined")
            //if(deepCopy && typeof(main[p]) =="object") //too big an hustle
               //main[p] = sec[p];
         if(sec[p].constructor == Object && typeof(main[p]) == "object")
            mergeRec(main[p],sec[p]);
         else
            main[p] = sec[p];         
      }
      return main;
   }

   function safeStringify(obj){
      var cache = [];
      var cacheKeys = [];
      return JSON.stringify(obj, (key, value) => {
         if (typeof value === 'object' && value !== null) { //arrays and null are also "objects" //functions are too, but typeof returns "function" instead
            //Duplicate reference found -> discard key / store
            const idx = cache.indexOf(value)
            //if duplicate found
               //return twin's key instead
            if(idx != -1) //-1 means not present
               return "dupOf_"+(cacheKeys[idx].toString() ?? "root");
               //else store it
            else{
               cache.push(value);
               cacheKeys.push(key);
            }
         }
         return value;
      });
   }
   
   function ObjectClone(obj){
      return JSON.parse(safeStringify(obj));
   }

   /**
    * takes a number and appends '0' until it has AT LEAST [digits] digits
    * @param {number} num value to format
    * @param {number} digits 
    * @returns {string} num with appended '0'
    */
   function fixedDigits(num, digits){
      var prefix = "";
      for(let i=0; i<digits; i++)
         if(num < 10*i)
            prefix += "0";
      return prefix + num;
   }
   
   /**
    * shorthand for math.random between  two numbers, either positive or negative.
    * @param {number} min 
    * @param {number} max 
    * @param {number} sumRandTimes >= 0, natural, 
    * @returns 
    */
   function randBetween(min,max,sumRandTimes=1){
      let r = 0;
      if(max < min)
         [min,max] = [min, max];
      for(let i=0; i<sumRandTimes; i++)
         r += Math.random();
      return min + (r/sumRandTimes) * (max-min);
   }
   //#endregion   ctrl+\ to fold (compatta)      ctrl+shift+\ to unfold (dispiega) //da qualsiasi riga vuota
/* ################################################################################################################################
   ################################### UIBUILDER ################################################################################## */
   //#region
   let ___UIBUILDER__; //vscode outline-view category pseudo-title
   /**
    * enforces msg standards
    * -sends a message to nodered through uibuilder
    * -by default it queue msgs if websocket is down, toggle this with waitForSocket flag
    * -the queue is held in socketMsgQueue global, msgs get sent without delays and with FIFO policy
    * @param {"event"|"request"} type 
    * @param {String} topic 
    * @param {null|Object} payload 
    */
   function sendToServer(type, topic, payload=null, waitForSocket=true){
      let msg = {type:type,topic:topic,payload:payload,clientId:self.cookies["uibuilder-client-id"]};
      if(waitForSocket){
         if(app.socketConnectedState)
            uibuilder.send(msg);
         else
            socketMsgQueue.push(msg);
      }
      else
         uibuilder.send(msg);
   }
   var socketMsgQueue = [];

   uibuilder.onChange('ioConnected', function(connected){
      console.info('[indexjs:uibuilder.onChange:ioConnected] Socket.IO Connection Status Changed to:', connected)
      app.socketConnectedState = connected
   });

   uibuilder.onChange("ioConnected",(ioConnected)=>{
      if(ioConnected){
         while(socketMsgQueue.length)
            uibuilder.send(socketMsgQueue.shift());
      }
   });

   


//#endregion   ctrl+\ to fold (compatta)      ctrl+shift+\ to unfold (dispiega) //da qualsiasi riga vuota
/* ################################################################################################################################
   ################################### SIGNAL CELL  ################################################################################# */
   //#region
   let ___SIGNAL_CELL__; //vscode outline-view category pseudo-title
   
   var CELLS_LAYOUT = [ //names are: unique
      ["FA419","FA420","FA421","FA422"],
      ["FA423","OMET","MO41","MO42"],
   ]
   var NROWS = CELLS_LAYOUT.length;
   var NCOLS = CELLS_LAYOUT[0].length;

   const CELLS = new Array(NROWS); for(let r=0; r<CELLS.length; r++) CELLS[r] = new Array(NCOLS);
   
   const CELLS_VIEW=[
      [0,0,0,0],
      [1,0,1,1]
   ]
   
   var MACHINE_CFGS = {
      "FA419":{ toA4Timeout:120*60*1000 },
      "FA420":{ toA4Timeout:120*60*1000 },
      "FA421":{ toA4Timeout:120*60*1000 },
      "FA422":{ toA4Timeout:120*60*1000 },
      "FA423":{ toA4Timeout:120*60*1000 },
      "OMET":{ toA4Timeout:120*60*1000 },
      "MO41":{ toA4Timeout:120*60*1000 },
      "MO42":{ toA4Timeout:120*60*1000 }
   }
   for(let mKey in MACHINE_CFGS) {
      MACHINE_CFGS[mKey].displayName = mKey
   }

   var MACHINE_KEYS = Object.keys(MACHINE_CFGS);
   var MACHINE_NAMES = (()=>{var arr=[]; for(let mKey in MACHINE_CFGS) arr.push(MACHINE_CFGS[mKey].name); return arr})()
   
   function cellOf(mKey, cells){
      let r=0,c=0;
      for(let row of CELLS_LAYOUT){
         for(let key of row){
            if(key == mKey)
               return cells[r][c];
            c++;
         }
         r++;
      }
   }

   function getInitedCell(){
      return {
         currentSignalKey:"noop",
      }
   }

   function getInitedCellMatrix(nrows,ncols){
      
   }

   //function applyStyle(type, el){
   //   let blinkTimeOn = 800, 
   //      blinkTimeOff = 350;
      
   //   //reset what needs to be
   //      //stop blinking if you were
   //   removeBlinker(el);
      
      
   //   //apply associated style
   //   if(el.className.match("signal-"))
   //      el.className = el.className.replace(/signal-[^\s-]+/, "signal-"+type);
   //   else
   //      el.classList.add("signal-"+type);
      
   //   //set blink timeouts and sounds
   //   switch(type){
   //      case "A1":{
   //         attachBlinker(el,"signal-A1-blinkoff", blinkTimeOn, blinkTimeOff); //immediately sets the off style
   //         //appendCountDownBlock(el);
   //         let cdBlock = showCountDownBlock(el);
   //         startCountdown(cdBlock, 20*60*1000);
   //         setApplyStyleTimeout(el, "A3", 20*60*1000, type); //declares el.touts.A1toA3
   //         //playAlarm();
   //         break;
   //      }
   //      case "A2":{
   //         //showCountDownBlock(el)
   //         removeBlinker(el);
   //         //stopAlarm();
   //         break;
   //      }
   //      case "A3":{
   //         setApplyStyleTimeout(el, "A4", machinesCfg.toA4Timeout, type); //declares el.touts.A3toA4
   //         break;
   //      }
   //      case "A4":{
   //         attachBlinker(el,"signal-A4-blinkoff", blinkTimeOn, blinkTimeOff); //immediately sets the off style
   //         break;
   //      }
   //      default:{
   //         removeBlinker(el);
   //         hideCountDownBlock(el);
   //            //cancel programmed state changes
   //         if(el.touts)
   //         for(key in el.touts)
   //            clearTimeout(el.touts[key]);
   //      }
   //   }
   //}

   ///**
   // * @desc Immediately adds offClass, then intermittently toggles it.
   // * - Declares el.blinkIntvOn and el.blinkIntvOff
   // * - if any of those attributes are already defined it logs an error to console and does nothing;
   // * @param {Object} el where to store and retrieve stateful information
   // * @param {string} offClass class with offTime style. Should have a greater specificity if it overwrites stuff
   // * @param {number} timeOn ms to stay on ON state
   // * @param {number} timeOff ms 
   // */
   //function attachBlinker(el, offClass, timeOn, timeOff){
   //   if(el.blinkIntvOn != undefined || el.blinkIntvOff){
   //      console.warn("attachBlink: property clash with name blinkIntv[On|Off] on. overwritten.", el);
   //      removeBlinker(el);
   //   }

   //   //add offClass now and every timeOn+timeOff ms
   //   el.classList.add(offClass);
   //   el.blinkIntvOff = setInterval(()=>{
   //      el.classList.add(offClass);
   //   },timeOn+timeOff);

   //   //after timeOff: remove class now and every timeOn+timeOff ms
   //   setTimeout(()=>{
   //      el.classList.remove(offClass);
   //      el.blinkIntvOff = setInterval(()=>{
   //         el.classList.remove(offClass);
   //      },timeOn+timeOff);
   //   },timeOff)
   //}
   ///** undo what {@linkcode attachBlinker} did
   // * @param {HTMLElement} el 
   // */
   //function removeBlinker(el){
   //   clearInterval(el.blinkIntvOff);
   //   clearInterval(el.blinkIntvOn);
   //   delete el.blinkIntvOff;
   //   delete el.blinkIntvOn;
   //}

   //function appendCountDownBlock(el){
   //   document.getElementById("a");
   //   var block = document.createElement("div");
   //   block.classList.contains("countdown-container");
      
   //   el.appendChild
   //}

   ///** style.display="block" on first children that has .countdown-container.
   // * @param {HTMLElement} el where to look
   // * @returns {HTMLElement} reference to the modified element */
   //function showCountDownBlock(el){
   //   for(child of el.children)
   //      if(child.classList.contains("countdown-container")){
   //         child.style.display = "block"
   //         return child;
   //      }
   //}
   ///** style.display="none" on first children that has .countdown-container.
   // * @param {HTMLElement} el where to look
   // * @returns {HTMLElement} reference to the modified element */
   //function hideCountDownBlock(el){
   //   for(child of el.children)
   //      if(child.classList.contains("countdown-container")){
   //         child.style.display = "none"
   //         return child;
   //      }
   //}

   ///**
   // * setups the variables and intervals responsible for the countdown elements animations.
   // * - expects a specific HTML architecture as it identifies elements through their position relatively to cdBlock
   // * - adds to cdBlock: timerLenght, end, minutes, seconds, refreshIntv.
   // * - refreshIntv updates both clock and bar.
   // * @param {HTMLElement} cdBlock container of the countdown elements. instance vars will be added here
   // * @param {number} msFromNow delay in ms, lenght of the countdown.
   // * @param {function} onComplete optional callback
   // */
   //function startCountdown(cdBlock, msFromNow, onComplete=noOp){
   //   let clockGroup =  cdBlock.firstElementChild;
   //   let progBar = cdBlock.children[1];
   //   cdBlock.timerLength = msFromNow; //bar ratio depends on this
   //   cdBlock.end = Date.now() + msFromNow; //unix time in ms when countdown will be completed

   //   const refresh = (remainingMs)=>{
   //      //update clock
   //      cdBlock.minutes = Math.trunc( remainingMs / (60*1000) );
   //      cdBlock.seconds = Math.round( (remainingMs - (cdBlock.minutes * 60*1000) ) / 1000 );
   //      clockGroup.firstElementChild.innerHTML = `${cdBlock.minutes}<span>:${fixedDigits(cdBlock.seconds, 2)}</span>`;
   //      //update bar
   //      var remainingPercentage = 100 - Math.round(remainingMs / cdBlock.timerLength);
   //      progBar.firstElementChild.style.width = `${remainingPercentage}%`;
   //   } 
      
   //   //refresh now and at 1s interval
   //   clearInterval(cdBlock.refreshIntv);
   //   refresh(msFromNow);
   //   cdBlock.refreshIntv = setInterval(()=>{
   //      var remainingMs = cdBlock.end - Date.now();
   //      if(remainingMs <= 0){
   //         remainingMs = 0;
   //         clearInterval(cdBlock.refreshIntv);
   //         onComplete();
   //      }
   //      refresh(remainingMs);
   //   },1000)
   //}

   ///**
   // * 
   // * @param {HTMLElement} el container of the countdown animated elements
   // * @param {string} toState {@link applyStyle|applyStyle()}-acceptable state to switch to.
   // * @param {number} delay timeout after which apply the style
   // * @param {string} fromState used to create a key in 'el' to store the timeout in
   // */
   //function setApplyStyleTimeout(el, toState, delay, fromState){
   //   const XtoX = toState + "to" + fromState; //like A1toA3
   //   if(!el.touts)
   //      el.touts = {};
   //   clearTimeout(el.touts[XtoX]);
   //   el.touts[XtoX] = setTimeout(applyStyle, 20*60*1000, toState, el);
   //}



   function connectionLost(){

   }

//#endregion   ctrl+\ to fold (compatta)      ctrl+shift+\ to unfold (dispiega) //da qualsiasi riga vuota