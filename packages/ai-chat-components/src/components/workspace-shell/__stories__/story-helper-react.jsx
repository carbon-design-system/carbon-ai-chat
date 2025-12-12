/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import React from "react";
import Tag from "../../../react/tag";

export function getHeaderDescription(type) {
  switch (type) {
    case "basic":
      return (
        <div slot="header-description">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco.
        </div>
      );
    case "withTags":
      return (
        <>
          <div slot="header-description">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco.
          </div>
          <div slot="header-description">
            <Tag size="sm" type="gray">
              Tag
            </Tag>
            <Tag size="sm" type="gray">
              Tag
            </Tag>
            <Tag size="sm" type="gray">
              Tag
            </Tag>
            <Tag size="sm" type="gray">
              Tag
            </Tag>
            <Tag size="sm" type="gray">
              Tag
            </Tag>
          </div>
        </>
      );
  }
}

export function getBodyContent(type) {
  switch (type) {
    case "short":
      return `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
        veniam, quis nostrud exercitation ullamco.
      `;
    case "long":
      return `
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur et
        velit sed erat faucibus blandit non nec felis. Nulla facilisi.
        Pellentesque nec finibus lectus. Vestibulum vitae sem eget lacus aliquam
        congue vitae ut elit. Vivamus vulputate elit vel ligula convallis, vitae
        dignissim risus porta. Donec ac augue ac odio accumsan sodales at eget
        nibh. Integer in mi ac enim porttitor ultricies vel non nunc. Maecenas
        cursus lorem ut nisl interdum, vitae maximus justo scelerisque. Fusce
        egestas sapien id sem luctus, nec hendrerit velit elementum. In in justo
        a nunc accumsan vestibulum. Quisque ut interdum est. Proin id felis ac
        justo blandit dictum. Suspendisse in tellus a risus fermentum volutpat
        vel quis leo. Curabitur varius, libero at pulvinar suscipit, urna nisi
        volutpat felis, sed maximus diam eros non metus. Donec lacinia metus non
        faucibus tristique. Praesent a ligula nec odio posuere porta. Cras ut
        odio vitae neque consequat posuere. Ut tristique metus non magna
        ullamcorper porta. Morbi porta, lorem quis sodales blandit, risus mi
        sollicitudin massa, et dignissim odio urna ut nibh. Nulla id suscipit
        urna. Pellentesque a dui malesuada, pulvinar justo in, porttitor elit.
        Etiam et odio vitae ligula gravida convallis. Integer pulvinar, neque
        sit amet consequat vulputate, felis magna sodales odio, ut pulvinar elit
        felis sed libero. Donec vitae purus ex. Vestibulum blandit mi eu nunc
        fermentum, at tristique libero fermentum. Duis nec sem vel magna
        efficitur luctus nec non eros. Vestibulum fringilla, enim at scelerisque
        fermentum, ligula tortor porttitor lorem, id egestas magna elit at
        lacus. Integer sagittis risus ut sapien ullamcorper, at suscipit tortor
        vulputate. Vivamus commodo lorem a libero dapibus tristique. Mauris sed
        commodo metus, sit amet sodales ex. Nam rhoncus lectus sit amet sem
        mattis, nec fermentum mi pretium. Nulla facilisi. Maecenas laoreet
        tortor quis lacinia dapibus. Aenean ac justo non neque sodales placerat.
        Integer dictum lorem nec elit fermentum, at dictum felis mattis.
        Suspendisse viverra volutpat eros ac rhoncus. Aliquam erat volutpat.
        Fusce tempor justo ac nisi fringilla, sit amet sagittis mi interdum.
        Vestibulum laoreet fermentum felis, sed commodo augue malesuada sit
        amet. Integer pharetra, sapien ac tincidunt dictum, arcu diam fermentum
        augue, at eleifend dolor orci in mauris. Donec gravida, leo in lacinia
        scelerisque, urna eros mattis nulla, non viverra enim nisl ac odio. Ut
        ac ante sit amet nisl tincidunt fringilla in id erat. Quisque finibus
        orci ut augue hendrerit, quis bibendum erat facilisis. Duis faucibus
        ligula id risus iaculis commodo. Nullam bibendum, felis quis elementum
        maximus, urna magna laoreet ante, nec tincidunt nunc mi non felis. Nulla
        malesuada, velit sed faucibus malesuada, ex risus feugiat eros, non
        commodo ipsum sem non erat. Integer tincidunt, nulla at faucibus
        euismod, mi turpis suscipit nisi, at convallis leo nunc et lectus. Sed
        euismod posuere risus, ut posuere libero pellentesque ac. Cras convallis
        sed erat a efficitur. Suspendisse potenti. Pellentesque ac imperdiet
        sem, vitae finibus erat. Cras nec libero magna. Aenean mattis sed augue
        nec pretium. Vestibulum tincidunt nulla id sagittis mattis. Mauris
        suscipit, urna eget consequat commodo, velit purus tincidunt erat, sed
        sodales lacus leo ut felis. Nullam gravida est nec efficitur euismod.
        Vivamus lacinia placerat neque in vehicula. Aenean dignissim nisi sed
        velit feugiat lacinia. Sed cursus sapien at sem pretium, vitae gravida
        augue mattis. Ut ullamcorper orci libero, ut fermentum sapien vehicula
        id. Aliquam erat volutpat. Donec consequat dictum mi, sit amet fringilla
        turpis feugiat ac. Mauris in elit nec ante dapibus efficitur. Sed
        luctus, justo at porta tincidunt, justo risus ultricies erat, non
        venenatis sapien magna nec urna. Nunc sit amet dapibus erat. Aenean
        tincidunt lorem a metus consequat vehicula. Proin dictum vestibulum
        mauris a posuere. Integer malesuada metus a bibendum suscipit. Nullam et
        sapien tincidunt, accumsan justo sit amet, faucibus lacus. Fusce sodales
        nunc id fermentum interdum. Nam mattis eros ut convallis sodales. Etiam
        porttitor, enim non bibendum mattis, ligula metus tincidunt magna, eget
        tincidunt purus nisl vel arcu.
      `;
  }
}
