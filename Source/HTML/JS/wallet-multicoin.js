//wallet-multicoin


//---------------------------------------------------------------------------
//Promise semaphor support
//---------------------------------------------------------------------------
var PROMISE_MAP={};
function InitPromiseMap()
{
    PROMISE_MAP={};
}
function FirstPromise(ID)
{
    var Item=PROMISE_MAP[ID];
    if(Item && Date.now() - Item.Time < 10*1000)
        return 0;

    Item={Time:Date.now()};
    PROMISE_MAP[ID]=Item;

    return 1;
}
function LeavePromise(ID)
{
    delete PROMISE_MAP[ID];
}


//---------------------------------------------------------------------------
//NFT fetch support
//---------------------------------------------------------------------------
var MAP_NFT_ATTR={};
var MAP_NFT_WORK={};
var MAP_NFT_WORK_NEW={};
setInterval(StartWorkNftImg(),1*1000);

function AddWorkNftImg(Addr,Num)
{
    MAP_NFT_WORK_NEW[Addr]=Num;
}
function RestartWorkNftImg()
{
    MAP_NFT_WORK=MAP_NFT_WORK_NEW;
    MAP_NFT_WORK_NEW={};
    StartWorkNftImg();
}
function StartWorkNftImg()
{
    var Count=0;
    for(var Addr in MAP_NFT_WORK)
    {
        var Attr=MAP_NFT_ATTR[Addr];
        if(Attr)
        {
            DoImgWork(Addr);
        }
        else
        {
            Count++;
            if(Count>10)
                break;

            SetNftAttrMap(Addr);
        }
    }
}
function DoImgWork(Addr)
{
    var Attr=MAP_NFT_ATTR[Addr];
    var Num=MAP_NFT_WORK[Addr];
    var Element=$("idImg"+Num);
    if(Element)
        Element.src=Attr.image;

    delete MAP_NFT_WORK[Addr];
}

function SetNftAttrMap(Addr)
{

    fetch(Addr, {method:'get', cache:'default', mode:'cors', credentials2:'include', headers:this.Headers}).then(function (response)
    {
        response.text().then(function (text)
        {
            var Attr=JSON.parse(text);
            MAP_NFT_ATTR[Addr]=Attr;
            DoImgWork(Addr);
            //console.log(Attr.image);
        });
    }).catch(function (err)
    {
    });
}


//--------------------------------------------------------------------------- NFT cards
async function FillListNFT(IDList,Account,PrefixNum,TokenName,bView)
{
    if(!FirstPromise("FillListNFT"))
        return;
    FillListNFTNext(IDList,Account,PrefixNum,TokenName,bView);
    LeavePromise("FillListNFT");
}

function GetCoinStoreNum()
{
    if(!CONFIG_DATA || !CONFIG_DATA.COIN_STORE_NUM)
        return 0;

    return  CONFIG_DATA.COIN_STORE_NUM;
}

async function FillListNFTNext(IDList, Account,PrefixNum,TokenName,bView)
{
    if(!PrefixNum)
        PrefixNum=0;
    var bNFT=0;
    var Str="";

    var CallNum=GetCoinStoreNum();
    if(!CallNum)
        return;
    if(bView)
    {
        var Tokens=await CallTeraProxy(CallNum,"GetTokens",{Account:Account,GetURI:1});
        if(Tokens)
        {
            var Num=PrefixNum+1;
            var Arr=Tokens.Arr;
            for(var t=0;t<Arr.length;t++)
            {
                bNFT=1;

                var Item=Arr[t];
                if(TokenName && Item.Token!=TokenName)
                    continue;

                for(var i=0;i<Item.Arr.length;i++)
                {
                    var Value=Item.Arr[i];

                    var Addr=Value.URI;

                    if(Addr)
                    {
                        //console.log(Addr);
                        AddWorkNftImg(Addr,Num);

                        Str+=GetNFTCard(IDList.id,Item,Value,Num);
                        Num++;
                    }
                }
            }

        }
    }


    if(IDList.strJSON !== Str)
    {
        IDList.strJSON = Str;
        IDList.innerHTML=Str;
    }

    SelectNFTItem(IDList.id);

    RestartWorkNftImg();

    if(idListNFT===IDList)
        SetVisibleBlock("idTokenNFT",bNFT);
    if(!bNFT)
        IDList.CurSelect="";

}

function GetNFTCard(ListId,Token,Value,Num)
{
    return `<item_nft id="idNFT${Num}" data-token="${Token.Token}" data-id="${Value.ID}" ondblclick="ChooseToken('${ListId}')" onclick="SelectNFTItem('${ListId}',this)">${Value.ID}<img class="img_nft" id="idImg${Num}">Items:<b>${FLOAT_FROM_COIN(Value)}</b></item_nft>`;
}

function GetCopyNFTCard(IdSrc,ID,Count)
{
    var Img=$(IdSrc.replace("idNFT","idImg"));
    return `<div>${ID}<img class="img_nft" src="${Img.src}">Items:<b>${Count}</b></div>`;
}

function SelectNFTItem(List,element)
{
    var IDList=$(List);
    if(element)
        IDList.CurSelect=element.id;

    var arr = document.querySelectorAll("item_nft");
    for (var n = 0; n < arr.length; n++)
    {
        let Item=arr[n];
        if(Item.id==IDList.CurSelect)
            Item.className="selected";
        else
            Item.className="";
    }
}
//---------------------------------------------------------------------------

function RetMultiCoins(Item,DopStr)
{
    var CoinStore=Item.CoinStore;
    if(!CoinStore)
        return "";
    var Count=0;
    for(var t=0;t<CoinStore.Arr.length;t++)
    {
        var Tokens=CoinStore.Arr[t];
        for(var i=0;i<Tokens.Arr.length;i++)
        {
            var Coin=Tokens.Arr[i];
            if(Coin.ID!=0)
                Count += FLOAT_FROM_COIN(Coin);
        }
    }
    if(!Count)
        return "";
    if(DopStr)
        Count = DopStr+Count+" items";
    return "<a class='olink' target='_blank' onclick='OpenTokensPage(" + Item.Num + ")'>" + Count + "</a>";
}

function OpenTokensPage(Account)
{
    var Str=`
    <div>
        <div class="row-head">NFT Tokens:</div>
        <BR>
        <grid_nft id="idListShow">
            <item_nft>Loading...</item_nft>
        </grid_nft>
    </div>
        `;

    openModal('idShowPage', 'idCloseShow');
    $("idShowContent").innerHTML = Str;

    FillListNFT(idListShow,Account,Account*10000+5000, "",1);
}



//--------------------------------------------------------------------------- Proxy support
async function CallTeraProxy(AccNum,Name,Params,ParamsArr)
{
    return new Promise(function(resolve, reject)
    {
        MStaticCall(AccNum,Name,Params,ParamsArr,function (Err,Value)
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
function MStaticCall(To,Name,Params,ParamsArr,F)
{
    if(typeof Params!=="object")
        return SetError("Error call "+Name);

    Params.cmd=Name;
    if(window.TESTMODE && To<200 || Name==="GetProxy")
        return StaticCall(To,Name,Params,ParamsArr,F);
    else
        return StaticCall(To,"Call",Params,ParamsArr,F);

}
function MSendCall(To,Name,Params,ParamsArr,From)
{
    if(typeof Params!=="object")
        return SetError("Error call "+Name);

    Params.cmd=Name;
    if(window.TESTMODE || Name==="SetProxy")
        return SendCallMethod(To,Name,Params,ParamsArr,From,-1);
    else
        return SendCallMethod(To,"Call",Params,ParamsArr,From,-1);
}
