/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

/**
 *
 * Asynchronous startup of the processing unit according to the timings
 *
**/
'use strict';
global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode});
function DoNode(Engine)
{
    if(Engine.Del)
        return ;
    if(Engine.ROOT_NODE)
        return ;
    Engine.TickNum++;
    var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
    if(Engine.LastCurBlockNum !== CurBlockNum)
    {
        Engine.LastCurBlockNum = CurBlockNum;
        if(Engine.SendTicket && global.glUseTicket)
        {
            Engine.InitTicket(CurBlockNum - JINN_CONST.STEP_TICKET);
        }
        Engine.DoBlockMining(CurBlockNum - JINN_CONST.STEP_MINING);
    }
    Engine.SendTicket(CurBlockNum - JINN_CONST.STEP_TICKET - 1);
    Engine.SendTicket(CurBlockNum - JINN_CONST.STEP_TICKET);
    Engine.SendTx(CurBlockNum - JINN_CONST.STEP_TX - 1);
    Engine.SendTx(CurBlockNum - JINN_CONST.STEP_TX);
    Engine.StartSendLiderArr(CurBlockNum - JINN_CONST.STEP_MAXHASH - 1);
    Engine.StartSendLiderArr(CurBlockNum - JINN_CONST.STEP_MAXHASH);
    Engine.StartSendLiderArr(CurBlockNum - JINN_CONST.STEP_MAXHASH + 1);
}
function InitClass(Engine)
{
    Engine.TickNum = 0;
}
