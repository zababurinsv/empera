/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

module.exports.Init = Init;
function Init(Engine)
{
    Engine.GetMaxNumBlockDB = function ()
    {
        return SERVER.GetMaxNumBlockDB();
    };
    Engine.SaveToDB = function (Block,aaa,bMining)
    {
        Engine.ConvertToTera(Block, 1);
        var Result = SERVER.WriteBlockDB(Block);
        if(Result)
        {
            var CurBlockNum = JINN_EXTERN.GetCurrentBlockNumByTime();
            if(Block.BlockNum > CurBlockNum - 100 && Block.arrContent && Block.arrContent.length)
                ADD_TO_STAT("MAX:TRANSACTION_COUNT", Block.arrContent.length);
            Engine.OnSaveBlock(Block);
        }
        return Result;
    };
    Engine.GetBlockDBInner = function (BlockNum)
    {
        var Block = SERVER.ReadBlockDB(BlockNum);
        if(!Block)
            return Block;
        Engine.ConvertFromTera(Block, 1);
        return Block;
    };
    Engine.GetBlockHeaderDBInner = function (BlockNum)
    {
        var Block = SERVER.ReadBlockHeaderDB(BlockNum);
        if(!Block)
            return Block;
        Engine.ConvertFromTera(Block, 0);
        return Block;
    };
    Engine.GetLinkHashDB = function (Block)
    {
        if(Block.BlockNum < JINN_CONST.BLOCK_GENESIS_COUNT)
            return ZERO_ARR_32;
        return SERVER.GetLinkHashDB(Block);
    };
}
