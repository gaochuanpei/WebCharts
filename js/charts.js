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
    final.init = function(){
      var _this = this;
      if(this.defaultOptions === undefined){
        this.defaultOptions = {
          type:"live-data",
          src:null,
          pollingTime:1000,
          xTitle:"",
          yTitle:"",
          xAxisLength:"auto"
        };
      }
      if(this.dataSource === undefined){
        var value;
        Object.defineProperty(this,"dataSource",{
          get(){
            return value;
          },
          set(newValue){
            value = newValue;
            _this.showChart();
          },
          enumerable:false,
          configurable:false
        })
      }
    };

    final.createYaxis = function(nodeParent,typeCharts){
        if(typeCharts !== "live-data")return null;
        var nodeG = createNode("g",{class:"y_axis"});
        var nodeLine = createNode("line",{x1:"0",y1:"290",x2:"800",y2:"290",style:"stroke:rgb(99,99,99);stroke-width:2"});
        nodeG.appendChild(nodeLine);
        nodeParent.appendChild(nodeG);
    };

    final.showChart = function(){
      this.createYaxis(this.nodeSvg,this.defaultOptions.type);
    };

    final.getAjaxData = function(options){
      var _this = this;
      var xhr = new XMLHttpRequest();
      //修复mozillar浏览器的部分bug
      if (xhr.overrideMimeType) {
        xhr.overrideMimeType("text/xml");
      }
      xhr.open("GET",options.src,true);
      xhr.onreadystatechange = function () {
        if(xhr.readyState == 4 && xhr.status == 200){
          _this.dataSource = xhr.responseText;
        }
      }
      xhr.send(null);
    };
    final.getData = function(options){
      var _this = this;
      switch (options.type){
        case "live-data":
          _this.getAjaxData(options);
          break;
        default:return false;
      }
      return true;
    };

    final.create = function (container,options) {
      //初始化
      this.init();

      if(!container)throw "Error:Container is wrong!";

      if(!options) return 0;
      for(var item in options){
        if (this.defaultOptions[item] !==undefined)this.defaultOptions[item]=options[item];
      }

      //获取html的container容器
      var Container = document.getElementById(container);

      //创建svg根节点并保存
      this.nodeSvg = createNode("svg",{id:"main_svg",width:"100%",height:"100%",xmlns:"http://www.w3.org/2000/svg"});

      //获取数据
      if(!this.getData(this.defaultOptions))return -1;
      //定义y轴线样式
      //this.createYaxis(nodeSvg,this.defaultOptions.type);

      //...
      Container.appendChild(this.nodeSvg);
    };

    //返回window.charts对象
    return final;
});
charts.create("container",{
  type:"live-data",
  src:"http://ranranbaobao.cn/profile/csv.php",
  pollingTime:1000
});