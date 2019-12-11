/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

global.JINN_MODULES.push({InitClass:InitClass, InitAfter:InitAfter});
function InitClass(Engine)
{
    Engine.CheckDoubleConnect = function (Child)
    {
        var ChildInTree = Engine.NodeByHashTree.find(Child);
        if(0 && ChildInTree && !ChildInTree.Del && ChildInTree.Active)
        {
            if(0 && Engine.RndAddr > ChildInTree.RndAddr)
            {
                Child.ToDebug("CLOSE DOUBLE 1 Hot:" + ChildInTree.Hot);
                Engine.StartDisconnect(Child, 1);
                ChildInTree.DirectIP = 1;
                return 0;
            }
            else
            {
                Engine.StartDisconnect(ChildInTree, 1);
                ChildInTree.ToLog("CLOSE DOUBLE 2 Hot:" + ChildInTree.Hot);
            }
        }
        if(!ChildInTree)
            Engine.NodeByHashTree.insert(Child);
        return 1;
    };
}
function InitAfter(Engine)
{
    Engine.SendConnectReq = function (Child)
    {
        if(!Engine.CanConnect(Child))
            return ;
        Engine.CreateConnectionToChild(Child, function (Result)
        {
            if(!Result)
                return ;
            var Data = {Protocol:JINN_CONST.PROTOCOL_NAME, Shard:JINN_CONST.SHARD_NAME, NodeHash:Engine.PubAddr, RndAddr:Engine.RndAddr};
            if(Engine.DirectIP && Engine.ip)
            {
                Data.ip = Engine.ip;
                Data.port = Engine.port;
            }
            Engine.Send("CONNECT", Child, Data, function (Child,Data)
            {
                Engine.OnConnectReturn(Child, Data);
                if(!Engine.CheckDoubleConnect(Child))
                    return ;
            });
        });
    };
    if(!Engine.ROOT_NODE)
        Engine.CONNECT = function (Child,Data)
        {
            if(Data.Protocol !== JINN_CONST.PROTOCOL_NAME || !Engine.CanConnect(Child))
            {
                Engine.DeleteConnect(Child);
                return {result:0};
            }
            Child.NodeHash = Data.NodeHash;
            Child.RndAddr = Data.RndAddr;
            if(!Engine.CheckDoubleConnect(Child))
                return {result:0};
            if(Data.ip && Data.port)
            {
                Child.ip = Data.ip;
                Child.port = Data.port;
                Child.DirectIP = 1;
            }
            Engine.AddConnect(Child);
            return {result:1, NodeHash:Engine.PubAddr, RndAddr:Engine.RndAddr};
        };
}
