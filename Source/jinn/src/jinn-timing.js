/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.JINN_MODULES.push({InitClass:InitClass, DoNode:DoNode});
function DoNode(Engine)
{
    if(Engine.Del)
        return ;
    Engine.TickNum++;
    var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
    if(Engine.LastCurBlockNum !== CurBlockNum)
    {
        Engine.LastCurBlockNum = CurBlockNum;
        if(global.CREATE_TX_PER_NODE < 0)
        {
            if(random(100) <=  - global.CREATE_TX_PER_NODE)
                Engine.AddCurrentProcessingTx(CurBlockNum, [Engine.CreateTx({BlockNum:CurBlockNum})]);
        }
        else
            if(global.CREATE_TX_PER_NODE > 0)
            {
                for(var i = 0; i < global.CREATE_TX_PER_NODE; i++)
                    Engine.AddCurrentProcessingTx(CurBlockNum, [Engine.CreateTx({BlockNum:CurBlockNum})]);
            }
        if(Engine.SendTicket && global.glUseTicket)
        {
            Engine.InitTicket(CurBlockNum);
        }
        Engine.SendTx(CurBlockNum - JINN_CONST.STEP_TX);
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
