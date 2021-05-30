//client-promise
//Promise support


async function AGetAccount(Account)
{
    var Data=await AGetData("GetAccountList",{StartNum:Account});
    if(Data && Data.result === 1 && Data.arr.length)
    {
        var Item = Data.arr[0];
        return Item;
    }

    return;
}

async function AGetBalance(Account)
{
    var Item=await AGetAccount(Account);
    if(Item)
        return FLOAT_FROM_COIN(Item.Value);

    return 0;
}

async function AGetData(Method,Params)
{
    return new Promise(function(resolve, reject)
    {
        GetData(Method, Params,function (Value,Text)
        {
            resolve(Value);
        });
    });
}


async function AStaticCall(AccNum,Name,Params,ParamsArr)
{
    return new Promise(function(resolve, reject)
    {
        StaticCall(AccNum,Name,Params,ParamsArr,function (Err,Value)
        {
            if(Err)
            {
                SetError(Value);
                reject(Value);
            }
            else
            {
                resolve(Value);
            }
        });
    });
}
