import * as sdk from '@botpress/sdk'
import { sentry as sentryHelpers } from '@botpress/sdk-addons'
import { wrapAction } from './action-wrapper'
import { DropboxClient } from './dropbox-api'
import * as bp from '.botpress'

const integration = new bp.Integration({
  async register(props) {
    const dropboxClient = await DropboxClient.create({ ctx: props.ctx, client: props.client })
    const authTest = await dropboxClient.isProperlyAuthenticated()

    if (!authTest) {
      throw new sdk.RuntimeError('Dropbox authentication failed. Please check your access token.')
    }
  },

  async unregister() {},

  actions: {
    createFile: wrapAction({ actionName: 'createFile' }, async ({ dropboxClient }, { contents, path }) => ({
      newFile: await dropboxClient.createFileFromText({ dropboxPath: path, textContents: contents }),
    })),
    listItemsInFolder: wrapAction(
      { actionName: 'listItemsInFolder' },
      ({ dropboxClient }, { path, recursive, nextToken }) =>
        dropboxClient.listItemsInFolder({ path: path ?? '', recursive: recursive ?? false, nextToken })
    ),
    deleteItem: wrapAction({ actionName: 'deleteItem' }, ({ dropboxClient }, { path }) =>
      dropboxClient.deleteItem({ path })
    ),
    downloadFile: wrapAction({ actionName: 'downloadFile' }, async ({ dropboxClient, client }, { path }) => {
      const fileBuffer = await dropboxClient.getFileContents({ path })

      const file = await client.uploadFile({
        key: `dropbox:${path}`,
        content: fileBuffer,
      })

      return { fileUrl: file.file.url }
    }),
    downloadFolder: wrapAction({ actionName: 'downloadFolder' }, async ({ dropboxClient, client }, { path }) => {
      const folderZipBuffer = await dropboxClient.downloadFolder({ path })

      const file = await client.uploadFile({
        key: `dropbox:${path}.zip`,
        content: folderZipBuffer,
      })

      return { zipUrl: file.file.url }
    }),
    createFolder: wrapAction({ actionName: 'createFolder' }, async ({ dropboxClient }, { path }) => ({
      newFolder: await dropboxClient.createFolder({ path }),
    })),
    copyItem: wrapAction({ actionName: 'copyItem' }, async ({ dropboxClient }, { fromPath, toPath }) => ({
      newItem: await dropboxClient.copyItemToNewPath({ fromPath, toPath }),
    })),
    moveItem: wrapAction({ actionName: 'moveItem' }, async ({ dropboxClient }, { fromPath, toPath }) => ({
      newItem: await dropboxClient.moveItemToNewPath({ fromPath, toPath }),
    })),
    searchItems: wrapAction(
      { actionName: 'searchItems' },
      async ({ dropboxClient }, searchParams) => await dropboxClient.searchItems(searchParams)
    ),

    filesReadonlyTransferFileToBotpress: wrapAction(
      { actionName: 'filesReadonlyTransferFileToBotpress' },
      async ({ dropboxClient, client }, { file: fileToTransfer, fileKey }) => {
        const fileBuffer = await dropboxClient.getFileContents({ path: fileToTransfer.id })

        const { file: uploadedFile } = await client.uploadFile({
          key: fileKey,
          content: fileBuffer,
        })

        return { botpressFileId: uploadedFile.id }
      }
    ),
    filesReadonlyListItemsInFolder: wrapAction(
      { actionName: 'filesReadonlyListItemsInFolder' },
      async ({ dropboxClient }, { folderId, filters, nextToken: prevToken }) => {
        const parentId = folderId ?? ''
        const { items, nextToken } = await dropboxClient.listItemsInFolder({
          path: parentId,
          recursive: false,
          nextToken: prevToken,
        })

        const mappedAndFilteredItems = items
          .map((item) => ({
            id: item.id,
            type: item.itemType,
            name: item.name,
            parentId,
            sizeInBytes: item.itemType === 'file' ? item.size : undefined,
            lastModifiedDate: item.itemType === 'file' ? item.modifiedAt : undefined,
            contentHash: item.itemType === 'file' ? item.revision : undefined,
            absolutePath: item.path,
          }))
          .filter(
            (item) =>
              !(
                (filters?.itemType && item.type !== filters.itemType) ||
                (filters?.maxSizeInBytes && item.sizeInBytes && item.sizeInBytes > filters.maxSizeInBytes) ||
                (filters?.modifiedAfter &&
                  item.lastModifiedDate &&
                  new Date(item.lastModifiedDate) < new Date(filters.modifiedAfter))
              )
          )

        return {
          items: mappedAndFilteredItems,
          meta: { nextToken },
        }
      }
    ),
  },

  async handler() {},

  channels: {},
})

export default sentryHelpers.wrapIntegration(integration, {
  dsn: bp.secrets.SENTRY_DSN,
  environment: bp.secrets.SENTRY_ENVIRONMENT,
  release: bp.secrets.SENTRY_RELEASE,
})
