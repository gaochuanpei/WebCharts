(function(root,create){
    root.charts = create(root);
})("undefined"!==typeof window?window:this,function (root) {
    var final={};
    function createNode(name,options) {
      options=options?options:{};
      var svgNS="http://www.w3.org/2000/svg";
      var newNode = document.createElementNS(svgNS, name);
      for(var item in options){
        newNode.setAttribute(item,options[item]);
      }
      return newNode;
    }
    final.defaultOptions = {
        type:"live-data",
        src:null,
        pollingTime:1000
    };

    final.createYaxis = function(nodeParent,typeCharts){
        if(typeCharts !== "live-data")return null;
        var nodeG = createNode("g",{class:"y_axis"});
        var nodeLine = createNode("line",{x1:"0",y1:"290",x2:"800",y2:"290",style:"stroke:rgb(99,99,99);stroke-width:2"});
        nodeG.appendChild(nodeLine);
        nodeParent.appendChild(nodeG);
    };

    final.create = function (container,options) {
      if(!container)throw "Error:Container is wrong!";
      /*
      * 判断是否传入options，未传入指定的绘制指令则直接退出
      * 目前测试阶段，暂时跳过此处
      * */

      //获取html的container容器
      var Container = document.getElementById(container);

      //创建svg根节点
      var nodeSvg = createNode("svg",{id:"main_svg",width:"100%",height:"100%",xmlns:"http://www.w3.org/2000/svg"});

      //定义y轴线样式
      this.createYaxis(nodeSvg,this.defaultOptions.type);

      //...
      Container.appendChild(nodeSvg);
    };

    //返回window.charts对象
    return final;
});
charts.create("container");