/* ################################################################################################################################
   ################################ GENERAL PURPOSE / UTILS  ###################################################################### */
   //#region
   let ___GENERAL_PURPOSE__; //vscode outline-view category pseudo-title
   /** placeholder for optional function arguments that expect a function, ex. callbacks */
   const noOp = function (){};
   const noop = noOp; //ignore typos
   var DBG = 0; //level of verbosity
   const DBG_LEVELS = ["disabled","info","debug","verbose"];
   
   /**
    * sequentially push values of arr
    * @param {any[]} arr 
    */
   if(Array.prototype.seqPush)   console.error("ATTENTION! Array.prototype.seqPush was already defined!!");
   Object.defineProperty(Array.prototype,"seqPush", { value: //not enumerable,not writable,not configurable
      function (arr){
         for(let val of arr)
            this.push(val);
      }
   })
   
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

   function safeStringify(obj, indent){
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
      },indent);
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

   //function fitTextWidth(el){
   //   let {clH:clientHeight,clW:clientWidth, scH:scrollHeight, scW:scrollWidth} = el;
   //   let style = window.getComputedStyle(el);
   //   const isWidthOverflown = ({scrollWidth, clientWidth}) => scrollWidth > clientWidth;
   //   if(scW > clW){
   //      el.style.fontSize = style.fontSize * clientWidth / scrollWidth
   //   }

   //}

   //fitText_withWidthRatio(el, maxVw=20, wOffsetPx=0){
   //   const textFitterClass = "text-fitter";
   //      //.text-fitter{
   //      //   line-height:0.75em !important;
   //      //   overflow:hidden !important;
   //      //}
         
   //   let {clW:clientWidth, scW:scrollWidth} = el;
   //   //el.classList.add(textFitterClass);
   //   el.style.fontSize = maxVw;
   //   el.style.fontSize = (maxVw * el.clientWidth / el.scrollWidth) + "vw";
   //}



   function fitTextToCurrentContainerWithScreenRatio(el, hStaticPx=0, wStaticPx=0){
      let {clH:clientHeight,clW:clientWidth, scH:scrollHeight, scW:scrollWidth} = el;
      let compStyle = window.getComputedStyle(el);
      let [vw,vh] = [window.innerWidth/100, window.innerHeight/100];

      const isWidthOverflown = ({scrollWidth, clientWidth}) => scrollWidth > clientWidth;
      
      //calc fontSize in vw to have the text fill the whole line width
         //set the width to a huge one, then proportionally shrink the text based on the generated overflow.
         //wStaticPx:   convert to vw, subtract it from the calculated fitVw, then add it back again in the final computed style
      console.log("actual el text", el.innerHTML);
      const maxFontSize = 20+"vw"
      el.style.fontSize = maxFontSize;
      const maxFontSizeVw =  parseFloat( window.getComputedStyle(el).fontSize.slice(0,-2) ) / window.innerWidth * 100;
      if(isWidthOverflown(el)){
         var fitVw = (maxFontSizeVw * el.clientWidth / el.scrollWidth);
         fitVw -= (wStaticPx / window.innerWidth * 100); //convert wStaticPx to Vw and subract it from fitVw
         fitVw += "vw";
      }
      else
         fitVw = maxFontSizeVw + "vw";

      //calc fontSize in vh to have the text fill the whole height
         //f() of el box's height
      const fontSpecificHeightScale = 1; //Segoe UI
      el.style.fontSize = maxFontSize;
      let fitVh = el.clientHeight / window.innerHeight * 100 * fontSpecificHeightScale;// + "vh";
      fitVh -= (fitVh/10); //prevent lowercase letters like g from overflowing down
      fitVh += "vh";
      el.style.fontSize = "50px";
      el.style.fontSize = `min(calc(${fitVw} + ${wStaticPx}px) , calc(${fitVh} + ${hStaticPx}px) )`;
      console.log("el fontSize set to",el.style.fontSize);
      return el.style.fontSize; //`min(calc(${fitVw} + ${wStaticPx}px) , calc(${fitVh} + ${hStaticPx}px) )`;
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
      let msg = {type:type, topic:topic, payload:payload, clientId:self.cookies["uibuilder-client-id"]};
      if(waitForSocket){
         if(uibuilder.get("ioConnected"))
            uibuilder.send(msg);
         else
            socketMsgQueue.push(msg);
      }
      else
         uibuilder.send(msg);
   }
   var socketMsgQueue = [];
   uibuilder.onChange("ioConnected",(ioConnected)=>{
      if(ioConnected){
         while(socketMsgQueue.length)
            uibuilder.send(socketMsgQueue.shift());
      }
   });

   var NR_TIME_OFFSET=null; //set by appInit //difference between Date.now("dateStr") called server side and here.//ST-CT = diff  ->  ST = diff + CT
   function nrDateNow(){
      NR_TIME_OFFSET ?? console.warn("[nrDateNow()]: NR_TIME_OFFSET not set. Assuming 0");
      return Date.now() + NR_TIME_OFFSET;
   }
   
   function totalWait(ms,mult,times){
      return (times <= 0 ?  0 : totalWait(ms,mult,times-1) + ms*Math.pow(mult,times));
   }

   /* //functions used to view expected socket retry wait times. //After the first 4 attempts in 30 secs the wait time avg around half the elapsed time, meaning that after 2 mins it tries once per min etc..
   
   function waitTable(ms, mult, times){
      const tableHead = ["index","waitTime","alreadyWaited"];
      var table = new Array(times).fill(0);
      
      for(let i=0;i<table.length;i++)
         table[i] = [
            i+1,
            msToScaledString(ms*Math.pow(mult,i+1)),
            msToScaledString(totalWait(ms,mult,i))
      ]
      return {table,tableHead};
   }
   /**   scales ms down to a more confortable unit returns it as a string with said unit as suffix. 
    *    int -> scaledFloat+'unit'     ex. '2.1h', '3.2gg', '26.3s' etc
    */
   function msToScaledString(ms) {
      let units = ["ms", "s", "min", "h", "gg"];
      let treshHoldMult = new Array(units.length).fill(2); //in terms of the associated unit // 1 hour == 3600ms -> if treshholdMult==2 then threshHold==3600*2
      let unitFactors = [1, 1000, 60, 60, 24]; //in terms of the preceding unit //ex. min are 1*1000*60
      //let getUnitFactor = (idx) => { var ret=0; for(let i=0;i<idx;i++) ret*=factor[i]; return ret; }

      var unitFactor = unitFactors[0];
      for (let i = 1; i < units.length; i++) {
         let lastUF = unitFactor;
         unitFactor *= unitFactors[i];
         if (Math.abs(ms) < unitFactor * treshHoldMult[i])
            return (ms / lastUF).toFixed(1) + units[i - 1];
      }
      return (ms / unitFactor).toFixed(1) + units[units.length - 1];
   }/**/

//#endregion   ctrl+\ to fold (compatta)      ctrl+shift+\ to unfold (dispiega) //da qualsiasi riga vuota
/* ################################################################################################################################
   #####################################  APP  #################################################################################### */
   //#region
   
   /** updates the app' variables that depend on nodered's configs
    * #TODO #TMP none of this vars trigger a reactive update. workaround: edit a reactive var, like headerText
   */
   window.nrConfigToAppConfig = function(config){
      try {
         let errCb = (attr,ret=undefined) => {console.error("missing attribute "+attr+" in onTopic(configUpdated) response", msg); return undefined};
         //app.CELLS_LAYOUT = msg.cellsLayout ?? errCb("cellsLayout");
         //try{ app.MACHINE_CFGS = msg.config.machines } catch(e) {errCb("config.machines")};

         ////set custom css //#TODO
         //   //signal-<sk>-<cssProp>:value;
         //{let customCss = msg.config.customCss;
         //   for(let item of customCss.signal)
         //}
         //update both app.MACHINE_CFGS and the related signalCells props
         app.MACHINE_CFGS = app.MACHINE_CFGS ?? new Array();
         for(let macKey in config.machines){
            let cell=app.signalCells[macKey];   let cfg=config.machines[macKey]; 
            //signalCells
            cell.displayName = cfg.displayName;
            cell.headerText = cfg.cellHeaderText;
            //if blink times changed -> re-apply blinkers
            if(cell.blinkIntvOn!=cfg.blinkIntvOn || cell.blinkIntvOff!=cfg.blinkIntvOff){
               cell.blinkIntvOn = cfg.blinkIntvOn;
               cell.blinkIntvOff = cfg.blinkIntvOff;
               let refs = app.$children.filter( comp => comp.$props.machineKey==macKey );
               for(let signCell of refs){
                  if(signCell.$data.inBlinkMode){
                     console.log("reset blinker with times", cell.blinkIntvOn, cell.blinkIntvOff)
                     signCell.removeBlinker(signCell);
                     signCell.setupBlinker(signCell, cell.blinkIntvOn, cell.blinkIntvOff);
                  }
               }
            }
            //preserves the references to MACHINE_CFG and its 1-deep keys (the macKeys), but breaks the rest
            Object.assign(app.MACHINE_CFGS[macKey], config.machines[macKey]);
         }
         
         //update CELLS_LAYOUT
            //memo: cellsLayout items can be null
         console.log("initing CELLS_LAYOUT");
         app.CELLS_LAYOUT = app.CELLS_LAYOUT ?? config.cellsLayout.map(r => r.map(v => null));
         app.CELLS_LAYOUT.forEach( (row,r) => {
            row.forEach( (val,c) => {
               row[c] = config.cellsLayout[r][c];
               console.log(`cellsLayout[${r}}][${c}]: ${row[c]} <- ${config.cellsLayout[r][c]} = ${app.CELLS_LAYOUT[r][c]}`);
            });
         });
         console.log("done");

         //update CELLS_VIEW from adminUI in config.views[viewKey]
         app.CELLS_VIEW = app.CELLS_VIEW ??  config.cellsLayout.map(r => r.map(v => false));
         {let viewKey = app.viewKey;
         let viewCfg = config.views[viewKey];
         let adminUISet = new Set( viewCfg.adminUI );
         app.CELLS_VIEW.forEach( (row,r) => {
            row.forEach( (val,c) => {
               row[c] = adminUISet.has(CELLS_LAYOUT[r][c]); //viewCfg.adminUI.includes(CELLS_LAYOUT[r][c]);
            })
         })
         }

         //trigger a reactive update (workaround)
            //add/subtr 1 from cd.end if it's even/odd (avoid cumulative changes)
            //edited cell must be visible, or it won't trigger anything
            //EDIT: using app.$set seemingly makes that var reactive
         app.$set(app.$data.CELLS_LAYOUT, 0, app.$data.CELLS_LAYOUT[0].map(v=>v));
         //{let macKey = "FA419"; //Object.keys(app.MACHINE_CFGS)[0];
         //let end = app.signalCells[macKey].cd.end;
         //app.signalCells[macKey].cd.end = (end&1) ? end+1 : end-1;
         //}
      }catch(e){
         if(e instanceof TypeError) console.error(e.message); //catch viewKey error
         else throw e;
      }
   }


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
      "FA419":{ toA4Timeout:1*60*1000 },
      "FA420":{ toA4Timeout:120*60*1000 },
      "FA421":{ toA4Timeout:120*60*1000 },
      "FA422":{ toA4Timeout:120*60*1000 },
      "FA423":{ toA4Timeout:120*60*1000 },
      "OMET":{ toA4Timeout:120*60*1000 },
      "MO41":{ toA4Timeout:120*60*1000 },
      "MO42":{ toA4Timeout:120*60*1000 }
   }
   {let cfg;
   for(let mKey in MACHINE_CFGS) {
      cfg=MACHINE_CFGS[mKey];
      cfg.displayName = mKey;
      cfg.cellHeaderText = "Local " + cfg.displayName;
      cfg.toA3Timeout = 2 * 60 * 1000;
      //cfg.toA4Timeout = this.toA4Timeout;
      cfg.initCellSignalKey = "noop";
      //cfg.initTowerBits = {};

   }}

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

   /** delays the setting of the first interval until it matches the expected trigger of intervals of the same freq. 
       * @param {function} intvSetter cb in charge of setting the intervals. 
       * @param {Number} intvLen ms
       * @param  {...any} setterParams passed to intvSetter()
       */
   function looseSync(intvSetter, intvLen, ...setterParams){
      let freq = intvLen;
      var tillNextTick = freq - (Date.now() % freq) //time until next tick
      setTimeout(intvSetter, tillNextTick, ...setterParams); //does not guarantee sync, as it might be delayed by intensive tasks
   }

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
   //   cdBlock.end = nrDateNow() + msFromNow; //unix time in ms when countdown will be completed

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
   //      var remainingMs = cdBlock.end - nrDateNow();
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

//#endregion   ctrl+\ to fold (compatta)      ctrl+shift+\ to unfold (dispiega) //da qualsiasi riga vuota

