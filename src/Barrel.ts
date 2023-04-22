
import { TextBlock } from 'babylonjs-gui';
import Entity from './Entity';
import { TransformNode } from 'babylonjs';

export default class Barrel extends Entity {
    label: TextBlock;
    monkeyCar: TransformNode;
    constructor(obj: TransformNode, label: TextBlock, car: TransformNode) {
        super(obj);
        this.label = label;
        this.monkeyCar = car;
    }
    public renderTick(): void {
        super.renderTick();
        const dist = Math.abs(this.obj.position.z - this.monkeyCar.position.z);
        const VISIBLE_DISTANCE = 60;
        const visible = this.obj.position.z > this.monkeyCar.position.z && (dist < VISIBLE_DISTANCE);
        this.label.isVisible = visible;
        if(visible) {
            const scale = 1 - (dist / VISIBLE_DISTANCE);
            this.label.scaleX = scale;
            this.label.scaleY = scale;
        }
    }
    public remove(): void {
        super.remove();
        this.label.dispose();
    }
}