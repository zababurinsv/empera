/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

const net = require("net");
global.JINN_MODULES.push({InitClass:InitClass, InitAfter:InitAfter});
function InitClass(Engine)
{
    Engine.BAN_IP = {};
    Engine.NodeByHashTree = new RBTree(function (a,b)
    {
        return CompareArr(a.NodeHash, b.NodeHash);
    });
    Engine.CreateServer = function ()
    {
        Engine.Server = net.createServer(function (Socket)
        {
            if(Engine.WasBanIP({address:Socket.remoteAddress}))
            {
                Engine.CloseSocket(Socket, "WAS BAN", true);
                return ;
            }
            var Child = Engine.RetChildByIPPort(Socket.remoteAddress, Socket.remotePort, 1);
            Engine.SetEventsProcessing(Socket, Child, "Client");
        });
        Engine.Server.on('close', function ()
        {
        });
        Engine.Server.on('error', function (err)
        {
            if(err.code === 'EADDRINUSE')
            {
                Engine.ToLog('Port ' + Engine.port + ' in use, retrying after 5 sec...');
                if(Engine.Server)
                    Engine.Server.close();
                setTimeout(function ()
                {
                    Engine.RunListenServer();
                }, 5000);
            }
        });
        Engine.RunListenServer();
    };
    Engine.RunListenServer = function ()
    {
        if(!Engine.port || typeof Engine.port !== "number")
            throw "Error port number = " + Engine.port;
        var LISTEN_IP = "0.0.0.0";
        Engine.ToDebug("Prepare to run TCP server on " + LISTEN_IP + ":" + Engine.port);
        Engine.Server.listen(Engine.port, LISTEN_IP, function ()
        {
            var AddObj = Engine.Server.address();
            Engine.ToLog("Run TCP server on " + AddObj.family + " " + AddObj.address + ":" + AddObj.port);
        });
    };
    Engine.SetEventsProcessing = function (SOCKET,Child,StrConnect)
    {
        Engine.LinkSocketToChild(SOCKET, Child, StrConnect);
        SOCKET.on('data', function (data)
        {
            if(SOCKET.WasClose)
            {
                return ;
            }
            if(SOCKET.Child)
            {
                if(GetSocketStatus(SOCKET) === 100)
                {
                    Engine.ReceiveFromNetwork(Child, data);
                }
                else
                {
                    Child.ToLog("CONNECT : Error GetSocketStatus");
                }
            }
        });
        SOCKET.on('close', function (err)
        {
            Engine.ClearSocket(SOCKET);
        });
        SOCKET.on('error', function (err)
        {
            Engine.CloseSocket(SOCKET, "ERRORS");
        });
        SOCKET.on('end', function ()
        {
        });
    };
    Engine.CloseSocket = function (Socket,StrError,bHide)
    {
        if(Socket.WasClose)
            return ;
        Engine.ToDebug("CloseSocket: " + Socket.remoteAddress + " " + StrError);
        Engine.ClearSocket(Socket);
        Socket.end();
    };
    Engine.ClearSocket = function (Socket)
    {
        var Child = Socket.Child;
        if(Child)
        {
            Child.Socket = undefined;
        }
        Socket.WasClose = 1;
        SetSocketStatus(Socket, 0);
        Socket.Child = undefined;
    };
    Engine.WasBanIP = function (rinfo)
    {
        if(!rinfo || !rinfo.address)
            return 0;
        var Key = "" + rinfo.address.trim();
        var Stat = Engine.BAN_IP[Key];
        if(Stat)
        {
            if(Stat.TimeTo > Date.now())
                return 1;
        }
        return 0;
    };
    Engine.LinkSocketToChild = function (Socket,Child,ConnectType)
    {
        if(Socket.Child)
            throw "Error LinkSocketToChild was Linked";
        Child.Disconnect = 0;
        Child.ConnectType = ConnectType;
        Socket.Child = Child;
        Child.Socket = Socket;
        Child.DirectIP = (ConnectType === "Server");
        SetSocketStatus(Socket, 100);
    };
    Engine.DeleteConnectNext = function (Child)
    {
        if(Child.Socket)
            Engine.CloseSocket(Child.Socket);
    };
}
function InitAfter(Engine)
{
    Engine.CreateServer();
    Engine.CreateConnectionToChild = function (Child,F)
    {
        if(Child.Disconnect)
        {
            F(0);
            return ;
        }
        var State = GetSocketStatus(Child.Socket);
        if(State === 100)
        {
            F(1);
        }
        else
        {
            if(State === 0)
            {
                Child.ToDebug("Connect to " + Child.ip + ":" + Child.port);
                if(Child.port > 30000)
                {
                    ToLog("Error port");
                    Child.Disconnect = 1;
                    F(0);
                    return ;
                }
                Child.Socket = net.createConnection(Child.port, Child.ip, function ()
                {
                    if(Child.Socket)
                    {
                        Engine.SetEventsProcessing(Child.Socket, Child, "Server");
                    }
                    F(!!Child.Socket);
                });
                SetSocketStatus(Child.Socket, 1);
            }
            else
            {
                F(0);
            }
        }
    };
    Engine.SENDTONETWORK = function (Child,Data)
    {
        if(Child.Disconnect)
            return ;
        var State = GetSocketStatus(Child.Socket);
        if(State === 100)
        {
            Child.Socket.write(Buffer.from(Data));
        }
        else
        {
        }
    };
}
function SetSocketStatus(Socket,Status)
{
    if(Socket && Socket.SocketStatus !== Status)
    {
        if(Status === 100 && Socket.Child)
            Socket.Child.LastTime = Date.now();
        Socket.SocketStatus = Status;
        Socket.TimeStatus = Date.now();
    }
}
function GetSocketStatus(Socket)
{
    if(Socket && Socket.SocketStatus)
    {
        if(Socket.SocketStatus !== 100)
        {
            var Delta = Date.now() - Socket.TimeStatus;
            if(Delta > JINN_CONST.MAX_WAIT_PERIOD_FOR_STATUS)
            {
                if(Socket)
                    CloseSocket(Socket, "MAX_WAIT_PERIOD_FOR_STATUS = " + Socket.SocketStatus + " time = " + Delta);
                return 0;
            }
        }
        return Socket.SocketStatus;
    }
    else
    {
        return 0;
    }
}
global.GetSocketStatus = GetSocketStatus;
