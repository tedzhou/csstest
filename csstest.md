#cssTest工具失败经历记录
## 背景

之前和龙哥一起做了个导航条优化的需求，修改了导航条顶部导航的html结构和样式。过程中发现js代码没有改动的滚动的逻辑，新导航上了之后在android
的chrome 上*滚动*卡的EB，Webview 中也有些卡顿，但没有chrome 里卡。这是我第一次意识到chrome也会卡，那chrome 和webview
可能不是用同一套渲染模型（当然大部分情景chrome是快多了的）。当时龙哥把几个臭名远瞩的*css属性*(`box-shadow`/`border-radius`)
干掉后立马就不那么卡了。

这使我有想法去监控下是什么样式改动会导致滚动变卡，毕竟触屏是个大项目，css样式也不少，大海捞针明显不科学。尽管PC上chrome的dev
tools很好用，却没能告诉开发者究竟是哪一行样式是性能瓶颈。我大海捞针在google找办法，终于找到一个[通过js模拟滚动的监控思路](http://andy.edinborough.org/CSS-Stress-Testing-and-Performance-Profiling)。

## 思路

[原文](http://andy.edinborough.org/CSS-Stress-Testing-and-Performance-Profiling)
作者的思路是遍历所有dom元素，去掉每个`dom`元素的`id`和`css-class`，然后用js设置`window
.scrollBy`去模拟滚动，然后记录*滚动时间/滚动的帧数*(不是准确的帧数，只是onscroll触发的次数）现在为了方便记*滚动时间/滚动的帧数*为`spf`，为了不和`fps`搞混，故意反过来写，当然`spf`越小越好。如果去掉某个css-class后`spf`明显变小，则说明这个css样式产生了不好的影响。

借鉴这个思路，我做了这个cssTest工具，有一下几个修改：
1. 我的目的是找出某一条css属性影响了性能，如果通过id和css-class来遍历会相对笼统。所以我遍历所有css属性，每次把所有dom
的某一条属性还原为默认值，然后滚动测试`spf`。
2. 原工具是上下来回滚动100px，那页面下面的某些元素却没有被渲染，不准。所以改成从上到下每次滚1px，滚3000ms。
3. 提供对比功能，输入某个css属性，试验出原样式和样式修改后的差别。

## 实验结果
### PC的Chrome
在PC上的实验结果真的让我以为找到了*答案*。
如图，`==base==`为原始的样式。去掉`position:fixed`后的`spf`和`==base==`甚至小了3、4
倍！而且这个实验结果也是符合预期的，`position:fixed`对滚动性能的影响也是众所周知的差了（[参见: Google I/O 2012 ]
(http://www.youtube.com/embed/hAzhayTnhEI?rel=0)）。
而且排第二差的是一个用来治疗ios图片加载闪屏的属性，android上用不上的css属性（其实ios上也没达到正常疗效），那么干掉它就能达到提升性能的目的了！当然，必须要在手机上有同样的表现才有证明这个工具works。

### 手机上的Chrome
手机上的Chrome同样找出了`position:fixed`的`spf`比`==base==`小1倍，也符合预期。
为了验证这个工具能找出`position:fixed`之外的性能瓶颈，我把之前龙哥去掉的`box-shadow`加上，也能查出来。那就表示这个工具还真有用！

### webview
目前触屏项目访问量最多的入口就是在webview，而且用户投诉也是集中在webview上。但在webview的测试结果却呈现出完全无规律的状态。`spf
`没有明显小的也没有明显大的。说明在webview里面，这个思路行不通。

## 分析模型失败的原因
原因其实很简单，我假象的浏览器渲染模型是:用户触发滚动->页面渲染->触发scroll事件。
只要记录下一段时间内的scroll触发的次数就可以估出页面渲染的性能，因为css样式渲染慢了，scroll事件就触发得少。但缺陷就在于js触发的滚动
浏览器不保证每次会去渲染，有可能就直接触发scroll事件了。
但PC上还是有一定规律可循的，会在连续scroll n次之后渲染一次，那么css样式影响渲染还是可以体现出来。

但在webview就完全没有规律了。由此可以猜想webview和chrome的渲染方式不一样，参考[Rendering Architecture Diagrams](http://www.chromium.org/developers/design-documents/rendering-architecture-diagrams)
。chrome用的是`Composited GPU rendering` 那么webview也许是`software
rendering`。有一个有趣的是，如果在页面放上`box-shadow`，手机的chrome反而比webview要忙，因为[Where things get
really messy is on mobile devices, because they have comparatively limited VRAM, and it becomes easy to exhaust that and end up with excruciatingly poor rendering performance](http://aerotwist.com/blog/on-translate3d-and-layer-creation-hacks/)

## 总结
cssTest工具没有成功，让我对纯js监控css性能产生了怀疑。希望能自己包装webview，在webview里直接监控css的fps
。虽然已经有了查看fps的应用，因为要去掉每个css样式，再记录fps，现有的fps还是不够用。

## code

