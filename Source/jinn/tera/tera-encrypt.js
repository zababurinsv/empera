/*
 * @project: JINN
 * @version: 1.0
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2019-2020 [progr76@gmail.com]
 * Telegram:  https://t.me/progr76
*/

'use strict';

module.exports.Init = Init;

function Init(Engine)
{
    Engine.ValueToXOR = function (Str,Rnd)
    {
        var Arr1 = toUTF8Array(Str);
        var Arr2 = sha3(global.COMMON_KEY + ":" + Rnd);
        return XORHash(Arr1, Arr2, 32);
    };
    Engine.ValueFromXOR = function (Node,Rnd,Arr1)
    {
        var Arr2 = sha3(global.COMMON_KEY + ":" + Rnd);
        var Arr = XORHash(Arr1, Arr2, 32);
        var Str = Utf8ArrayToStr(Arr);
        return Str;
    };
}

function XORHash(arr1,arr2,length)
{
    var arr3 = [];
    for(var i = 0; i < length; i++)
    {
        arr3[i] = arr1[i] ^ arr2[i];
    }
    return arr3;
}
