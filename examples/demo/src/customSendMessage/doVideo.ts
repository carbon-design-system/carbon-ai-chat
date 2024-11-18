/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
 */

import { ChatInstance, MessageResponseTypes, VideoItem } from '@carbon/ai-chat';

function doVideo(instance: ChatInstance) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          source: 'https://vimeo.com/118761396',
          response_type: MessageResponseTypes.VIDEO,
          dimensions: {
            base_height: 126,
          },
        } as VideoItem,
        {
          source: 'https://www.youtube.com/watch?v=y_6hQOUx-dg',
          response_type: MessageResponseTypes.VIDEO,
        } as VideoItem,
      ],
    },
  });
}

export { doVideo };
