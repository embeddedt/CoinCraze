import {Node, TransformNode} from 'babylonjs';

export type EntityNode<T extends Node, E extends Entity = Entity> = T&{
    entity?: E;
};

export default class Entity {
    obj: TransformNode;
    isRemoved: boolean;
    constructor(obj: TransformNode) {
        this.obj = obj;
    }
    public tick() {

    }
    public renderTick() {

    }
    public remove() {
        this.isRemoved = true;
        this.obj.dispose();
    }
}