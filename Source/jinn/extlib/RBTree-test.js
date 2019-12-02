/*
 * @project: TERA
 * @version: Development (beta)
 * @license: MIT (not for evil)
 * @copyright: Yuriy Ivanov (Vtools) 2017-2019 [progr76@gmail.com]
 * Web: https://terafoundation.org
 * Twitter: https://twitter.com/terafoundation
 * Telegram:  https://t.me/terafoundation
*/

require("./RBTree");
TestRBTree();
function TestRBTree()
{
    var Tree = new RBTree(function (a,b)
    {
        return a.value - b.value;
    });
    var Value = {value:1, data:123};
    if(!Tree.find(Value))
        Tree.insert(Value);
    var Value2 = {value:2, data:123};
    Tree.insert(Value2);
    if(!Tree.find(Value))
        Tree.insert(Value);
    var it = Tree.iterator(), Item;
    while((Item = it.next()) !== null)
    {
        console.log(JSON.stringify(Item));
    }
    console.log(JSON.stringify(Tree.min()));
}
