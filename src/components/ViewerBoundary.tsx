import { Button } from '../ui';
import {Component,type ReactNode} from 'react';
export class ViewerBoundary extends Component<{children:ReactNode},{error:string}>{
 state={error:''};
 static getDerivedStateFromError(error:Error){return {error:error.message||'Unable to initialise the 3D viewer.'};}
 render(){return this.state.error?<div className="house-canvas loading-3d" role="alert"><div><h3>3D view could not load</h3><p>{this.state.error}</p><p>Check WebGL support and the uploaded models. Your brief and plans are still saved.</p><Button className="button secondary" onClick={()=>this.setState({error:''})}>Reload viewer</Button></div></div>:this.props.children;}
}
