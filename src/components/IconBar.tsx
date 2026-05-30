export default function IconBar() {
  return (
    <div style={{  height: '48px', paddingTop: "16px", paddingBottom: "16px", paddingLeft: "18px", paddingRight: "18px", display: "flex", borderBottom: "1px solid #385677" }}>
        <img src="src/assets/roadsense-1024.png" style={{ width: "48px", height: "48px", marginRight: "13px"}} />
        <div style={{ display: "block", padding:"0px", margin: "0px", height: "48px"}}>
          <h3 style={{ margin: "0px"}}>RoadSense</h3>
          <p style={{ fontSize: "10px", color: "#4a6888", margin: "0px"}}>Road Quality Analysis</p>
        </div>
      {}
    </div>
  )
}