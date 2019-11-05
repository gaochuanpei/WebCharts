# WebCharts
A small-size module that use remota data to draw web charts with SVG  
Use Example:  
1.  
charts.create("container",{  
  type:"live-data",  
  src:"http://...",  
  pollingTime:1000,  
  xAxisLength:300  
});  
2.  
var a = new charts.create(id,{  
  type:"live-data",  
  src:"http://...",  
  pollingTime:1000,  
  xAxisLength:300  
});
