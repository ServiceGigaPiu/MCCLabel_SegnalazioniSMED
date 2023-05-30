
var req = new XMLHttpRequest();
req.open("GET","")

/** **REQUIRED** Start uibuilder comms with Node-RED @since v2.0.0-dev3
      * Pass the namespace and ioPath variables if hosting page is not in the instance root folder
      * e.g. If you get continual `uibuilderfe:ioSetup: SOCKET CONNECT ERROR` error messages.
      * e.g. uibuilder.start('/uib', '/uibuilder/vendor/socket.io') // change to use your paths/names
      * @param {Object=|string=} namespace Optional. Object containing ref to vueApp, Object containing settings, or String IO Namespace override. changes self.ioNamespace from the default.
      * @param {string=} ioPath Optional. changes self.ioPath from the default
      * @param {Object=} vueApp Optional. Reference to the VueJS instance. Used for Vue extensions.
      */
uibuilder.start()
      
const uiBuilder = uibuilder; //alias because camelCase it's the way and i got it wrong too effing many times
//brutely define method onTopic //use global onTopicCbList to have a reference of all registered onChange for dbg purposes
uibuilder.onTopicCbList = [];
uibuilder.onTopicList = [];
uibuilder.onTopic = function (topic, callback){
   uibuilder.onTopicList.push(topic);
   uibuilder.onTopicCbList[topic] ? uibuilder.onTopicCbList[topic].push(callback) : uibuilder.onTopicCbList[topic] = [callback];

   return uibuilder.onChange('msg',(e) => {
      //e === msg received
      if(e.topic == topic)
         callback(e);
   });
}

//#DBG //#TMP look for typos
uiBuilder.onChange(msg => {
   if(uibuilder.onTopicList.indexOf(msg.topic) >= 0)
      console.warn("[typo prevention]: unhandled topic ",msg.topic,msg);
})

//use setSingleCellState for all
uibuilder.onTopic("initApp",(msg)=>{
   try{
      let errCb = (attr,ret=undefined) => {console.error("missing attribute "+attr+" in onTopic(initApp) response", msg); return undefined};
      //app.CELLS_LAYOUT = msg.cellsLayout ?? errCb("cellsLayout");
      //try{ app.MACHINE_CFGS = msg.config.machines } catch(e) {errCb("config.machines")};

      //sync time between server and client
      NR_TIME_OFFSET = msg.timeSync.now + 100 - Date.now();//Date.parse(msg.timeSync.formatString);
      //console.warn("NR_TIME_OFFSET becomes ",NR_TIME_OFFSET," and its function returns ",nrDateNow(),"with a diff of ",new Date(nrDateNow()).toString() )


      //init App Vars that depend on nr config
         //MACHINE_CFGS & related signalCells props (again)
         //CELLS_LAYOUT
         //CELLS_VIEW //set to current app.viewKey
      app.viewKey = msg.viewKey;
      nrConfigToAppConfig(msg.config);
      

      //set all signalCells from nr_signalCellState (same as onTopic(setSingleSignalCellState) )
      {let cell,state,cfg; for(let macKey of msg.signalCellsStates.dictionary.macKeys){
         //aliases
         cell = app.$data.signalCells[macKey];
         state = msg.signalCellsStates[macKey];
         cfg = msg.config.machines[macKey];
         //console.warn("parsing ",macKey,"pointing cell,state:",cell, state)

         //set 
         cell.signalKey = state.signalKey ?? errCb("signalCellsStates.[macKey].signalKey");
         //cell.displayName = cfg.displayName;
         //cell.headerText = cfg.cellHeaderText;

         //if no timer-related data was sent or time's up
            //hide timer
         if(!state.timerEnd || nrDateNow() > state.timerEnd){
            cell.cd.remainingMs = 0;
            //console.log("cd hidden",ObjectClone(cell.cd));
            app.clearCountdown(cell.cd);
         }
         else{
            cell.cd.timerLength = state.timerEnd - state.timerStart
            cell.cd.remainingMs = Math.max(0, state.timerEnd - nrDateNow());
            cell.cd.end = state.timerEnd;
            //console.log("cd shown",ObjectClone(cell));
            app.setupCountdownRefresher(cell.cd)
         }
      }}


      ////set CELL_VIEW from config.views[viewKey]
      //let viewKey = msg.viewKey;          if(!msg.config.views || !msg.config.views[viewKey]) throw new TypeError(`[onTopic initApp]: missing viewKey ${viewKey} from msg.config.views `);
      //let viewCfg = msg.config.views[viewKey]; //msg.config.views[viewKey];  
      //   //check that all adminUI keys are macKeys
      ////if( !viewCfg.adminUI.every((function(){ let macKeys=app.CELLS_LAYOUT.flat(); return (val) => macKeys.include(val)})()) ) throw new TypeError(`[onTopic initApp]: ${viewCfg.adminUI[i]} is not a valid macKey. valid macKeys:${macKeys}`);//viewCfg.adminUI.forEach( (macKey) => {if(cellsLayout)})
      ////viewCfg.adminUI.forEach( macKey => app.CELL_VIEW[ CELLS_LAYOUT.indexOf(macKey) ] = true );
      ////app.CELL_VIEW.forEach( r,i,row => row.forEach( v,i => app.CELL_VIEW[r][i]=2 ));
      //app.CELLS_LAYOUT.forEach( (row, r) => 
      //   row.forEach( (macKey,c) => app.CELLS_VIEW[r][c] = viewCfg.adminUI.includes(macKey) ));
      //app.adminUI = viewCfg.adminUI;
   
   }
   catch(e){
      if(e instanceof TypeError) console.error(e.message); //catch viewKey error
      else throw e;
   }
   console.info("[initApp]: inited with",msg.viewKey,msg," -> to CLAY",app.CELLS_LAYOUT,"to CVIEW", app.CELLS_VIEW,"to MCFG", app.MACHINE_CFGS,"to SCells",ObjectClone(app.signalCells));
});
