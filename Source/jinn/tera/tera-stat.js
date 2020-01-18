/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

module.exports.Init = Init;
const os = require('os');
var GlSumUser;
var GlSumSys;
var GlSumIdle;
function Init(Engine)
{
    SERVER.GetActualNodes = function ()
    {
        var Arr = [];
        for(var i = 0; i < Engine.ConnectArray.length; i++)
        {
            var Child = Engine.ConnectArray[i];
            if(!Child || !Child.IsOpen())
                continue;
            Arr.push(Child);
        }
        return Arr;
    };
    SERVER.OnStartSecond = function ()
    {
        SERVER.CurrentBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
        PrepareStatEverySecond();
        var Arr = SERVER.GetActualNodes();
        global.CountAllNode = Engine.GetCountAddr();
        ADD_TO_STAT("MAX:HOT_NODES", Arr.length);
        ADD_TO_STAT("MAX:CONNECTED_NODES", Arr.length);
        ADD_TO_STAT("MAX:ALL_NODES", global.CountAllNode);
        ADD_TO_STAT("SENDDATA(KB)", Engine.SendTraffic / 1024);
        ADD_TO_STAT("GETDATA(KB)", Engine.ReceiveTraffic / 1024);
        Engine.SendTraffic = 0;
        Engine.ReceiveTraffic = 0;
        ADD_TO_STAT("MAX:TIME_DELTA", DELTA_CURRENT_TIME);
        ADD_TO_STAT("USEPACKET", Engine.ReceivePacket);
        Engine.ReceivePacket = 0;
        ADD_TO_STAT("NETCONFIGURATION", Engine.NetConfiguration);
        Engine.NetConfiguration = 0;
        ADD_TO_STAT("ERRORS", Engine.ErrorCount);
        Engine.ErrorCount = 0;
        ADD_TO_STAT("MAX:MEMORY_USAGE", process.memoryUsage().heapTotal / 1024 / 1024);
        ADD_TO_STAT("MAX:MEMORY_FREE", os.freemem() / 1024 / 1024);
        var SumUser = 0;
        var SumSys = 0;
        var SumIdle = 0;
        var cpus = os.cpus();
        for(var i = 0; i < cpus.length; i++)
        {
            var cpu = cpus[i];
            SumUser += cpu.times.user;
            SumSys += cpu.times.sys + cpu.times.irq;
            SumIdle += cpu.times.idle;
        }
        if(GlSumUser !== undefined)
        {
            var maxsum = cpus.length * 1000;
            ADD_TO_STAT("MAX:CPU_USER_MODE", Math.min(maxsum, SumUser - GlSumUser));
            ADD_TO_STAT("MAX:CPU_SYS_MODE", Math.min(maxsum, SumSys - GlSumSys));
            ADD_TO_STAT("MAX:CPU_IDLE_MODE", Math.min(maxsum, SumIdle - GlSumIdle));
            ADD_TO_STAT("MAX:CPU", Math.min(maxsum, SumUser + SumSys - GlSumUser - GlSumSys));
        }
        GlSumUser = SumUser;
        GlSumSys = SumSys;
        GlSumIdle = SumIdle;
    };
}
