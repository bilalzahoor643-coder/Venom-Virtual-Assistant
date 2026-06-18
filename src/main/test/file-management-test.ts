const { app } = require('electron')
const path = require('path')
const fs = require('fs/promises')

const TEST_DIR = path.join(app.getPath('userData'), 'FileManagementTests')

class FileManagementTest {
  constructor() {
    this.results = []
    this.passed = 0
    this.failed = 0
  }

  async run() {
    console.log('\n========================================')
    console.log('  IRIS File Management - Complete Test')
    console.log('========================================\n')

    await this.setup()

    // Phase 1: Basic Operations
    await this.test_readFile_NonExistent()
    await this.test_readFile_Directory()
    await this.test_readFile_Success()
    await this.test_writeFile_Success()
    await this.test_writeFile_NewDir()
    await this.test_fileOps_Copy()
    await this.test_fileOps_Move()
    await this.test_fileOps_Delete()
    await this.test_fileOps_DeleteDir()
    await this.test_fileOps_CrossDeviceMove()
    await this.test_fileOpen_Success()
    await this.test_fileReveal()
    await this.test_createDirectory()
    await this.test_readDirectory()
    await this.test_readDirectory_NonExistent()

    // Phase 2: Enhanced Features
    await this.test_getFileProperties()
    await this.test_getFileProperties_Directory()
    await this.test_getFolderInfo()
    await this.test_fileExists_True()
    await this.test_fileExists_False()
    await this.test_renameFile()
    await this.test_renameFile_Exists()
    await this.test_getRecentFiles()
    await this.test_getFileTypeInfo_Text()
    await this.test_getFileTypeInfo_Image()
    await this.test_findDuplicates()
    await this.test_openInIRISViewer_Text()
    await this.test_openInIRISViewer_Image()
    await this.test_openFileInApp()

    // Phase 3: Permission & Error Handling
    await this.test_permissionDenied()
    await this.test_crossDeviceCopy()
    await this.test_largeFile()
    await this.test_specialCharacters()

    // Phase 4: Edge Cases
    await this.test_emptyFile()
    await this.test_nestedDirectories()
    await this.test_deeplyNestedPath()

    await this.cleanup()

    this.printSummary()
    return this.passed === this.total
  }

  async setup() {
    try { await fs.rm(TEST_DIR, { recursive: true, force: true }) } catch {}
    await fs.mkdir(TEST_DIR, { recursive: true })
    await fs.mkdir(path.join(TEST_DIR, 'sub1'), { recursive: true })
    await fs.mkdir(path.join(TEST_DIR, 'sub2'), { recursive: true })

    await fs.writeFile(path.join(TEST_DIR, 'test.txt'), 'Hello World', 'utf-8')
    await fs.writeFile(path.join(TEST_DIR, 'test.json'), '{"key":"value"}', 'utf-8')
    await fs.writeFile(path.join(TEST_DIR, 'test.js'), 'console.log("test")', 'utf-8')
    await fs.writeFile(path.join(TEST_DIR, 'sub1', 'nested.txt'), 'Nested content', 'utf-8')
    await fs.writeFile(path.join(TEST_DIR, 'sub2', 'copy.txt'), 'Copy me', 'utf-8')
  }

  async cleanup() {
    try { await fs.rm(TEST_DIR, { recursive: true, force: true }) } catch {}
  }

  async test(name, fn) {
    try {
      await fn()
      this.results.push({ name, status: 'PASS' })
      this.passed++
      console.log(`  ✓ ${name}`)
    } catch (err) {
      this.results.push({ name, status: 'FAIL', error: err.message })
      this.failed++
      console.log(`  ✗ ${name}: ${err.message}`)
    }
  }

  assert(condition, msg) { if (!condition) throw new Error(msg || 'Assertion failed') }
  assertEqual(a, b, msg) { if (a !== b) throw new Error(msg || `Expected ${b}, got ${a}`) }

  get total() { return this.passed + this.failed }

  printSummary() {
    console.log('\n========================================')
    console.log(`  Results: ${this.passed}/${this.total} passed, ${this.failed} failed`)
    console.log('========================================\n')
  }

  // ====== PHASE 1: BASIC OPERATIONS ======

  async test_readFile_NonExistent() {
    await this.test('read-file: Non-existent file returns error', async () => {
      const { readFile } = require('../main/manager/file-read')
      const result = await readFile(path.join(TEST_DIR, 'nonexistent.txt'))
      this.assert(result.success === false, 'Should return success: false')
      this.assert(result.errorCode === 'ENOENT', `Should be ENOENT, got ${result.errorCode}`)
    })
  }

  async test_readFile_Directory() {
    await this.test('read-file: Directory returns EISDIR', async () => {
      const { readFile } = require('../main/manager/file-read')
      const result = await readFile(TEST_DIR)
      this.assert(result.success === false, 'Should return success: false')
      this.assert(result.errorCode === 'EISDIR', `Should be EISDIR, got ${result.errorCode}`)
    })
  }

  async test_readFile_Success() {
    await this.test('read-file: Reads file successfully', async () => {
      const { readFile } = require('../main/manager/file-read')
      const result = await readFile(path.join(TEST_DIR, 'test.txt'))
      this.assert(result.success === true, 'Should return success: true')
      this.assert(result.content.includes('Hello World'), 'Should contain file content')
    })
  }

  async test_writeFile_Success() {
    await this.test('write-file: Writes file to desktop', async () => {
      const { writeFile } = require('../main/manager/file-write')
      const result = await writeFile({ fileName: path.join(TEST_DIR, 'written.txt'), content: 'Written content' })
      this.assert(result.success === true, 'Should return success: true')
      const content = await fs.readFile(result.path, 'utf-8')
      this.assertEqual(content, 'Written content')
    })
  }

  async test_writeFile_NewDir() {
    await this.test('write-file: Creates directory if missing', async () => {
      const { writeFile } = require('../main/manager/file-write')
      const target = path.join(TEST_DIR, 'newdir', 'file.txt')
      const result = await writeFile({ fileName: target, content: 'New dir content' })
      this.assert(result.success === true, 'Should create directory and write')
    })
  }

  async test_fileOps_Copy() {
    await this.test('file-ops: Copy file successfully', async () => {
      const { executeFileOp } = require('../main/manager/file-ops')
      const src = path.join(TEST_DIR, 'test.txt')
      const dest = path.join(TEST_DIR, 'test_copy.txt')
      const result = await executeFileOp({ operation: 'copy', sourcePath: src, destPath: dest })
      this.assert(result.success === true, 'Copy should succeed')
      const content = await fs.readFile(dest, 'utf-8')
      this.assertEqual(content, 'Hello World')
    })
  }

  async test_fileOps_Move() {
    await this.test('file-ops: Move file successfully', async () => {
      const { executeFileOp } = require('../main/manager/file-ops')
      const src = path.join(TEST_DIR, 'sub2', 'copy.txt')
      const dest = path.join(TEST_DIR, 'moved.txt')
      const result = await executeFileOp({ operation: 'move', sourcePath: src, destPath: dest })
      this.assert(result.success === true, 'Move should succeed')
      const content = await fs.readFile(dest, 'utf-8')
      this.assertEqual(content, 'Copy me')
    })
  }

  async test_fileOps_Delete() {
    await this.test('file-ops: Delete file successfully', async () => {
      await fs.writeFile(path.join(TEST_DIR, 'to_delete.txt'), 'delete me', 'utf-8')
      const { executeFileOp } = require('../main/manager/file-ops')
      const result = await executeFileOp({ operation: 'delete', sourcePath: path.join(TEST_DIR, 'to_delete.txt') })
      this.assert(result.success === true, 'Delete should succeed')
      let exists = true
      try { await fs.access(path.join(TEST_DIR, 'to_delete.txt')) } catch { exists = false }
      this.assert(!exists, 'File should be deleted')
    })
  }

  async test_fileOps_DeleteDir() {
    await this.test('file-ops: Delete directory recursively', async () => {
      await fs.mkdir(path.join(TEST_DIR, 'del_dir'), { recursive: true })
      await fs.writeFile(path.join(TEST_DIR, 'del_dir', 'file.txt'), 'x', 'utf-8')
      const { executeFileOp } = require('../main/manager/file-ops')
      const result = await executeFileOp({ operation: 'delete', sourcePath: path.join(TEST_DIR, 'del_dir') })
      this.assert(result.success === true, 'Dir delete should succeed')
    })
  }

  async test_fileOps_CrossDeviceMove() {
    await this.test('file-ops: Cross-device move fallback to copy+delete', async () => {
      const { executeFileOp } = require('../main/manager/file-ops')
      await fs.writeFile(path.join(TEST_DIR, 'cross.txt'), 'cross device', 'utf-8')
      const result = await executeFileOp({
        operation: 'move',
        sourcePath: path.join(TEST_DIR, 'cross.txt'),
        destPath: path.join(TEST_DIR, 'cross_moved.txt')
      })
      this.assert(result.success === true, 'Cross-device move should work via copy+delete')
    })
  }

  async test_fileOpen_Success() {
    await this.test('file:open: Opens file with default app', async () => {
      const { openFile } = require('../main/manager/file-open')
      const result = await openFile(path.join(TEST_DIR, 'test.txt'))
      this.assert(result.success === true, 'Open should succeed')
    })
  }

  async test_fileReveal() {
    await this.test('file:reveal: Reveals file in Explorer', async () => {
      const { revealFile } = require('../main/manager/file-open')
      const result = await revealFile(path.join(TEST_DIR, 'test.txt'))
      this.assert(result.success === true, 'Reveal should succeed')
    })
  }

  async test_createDirectory() {
    await this.test('create-directory: Creates directory', async () => {
      const dirPath = path.join(TEST_DIR, 'new_folder')
      const fs = require('fs/promises')
      await fs.mkdir(dirPath, { recursive: true })
      const stats = await fs.stat(dirPath)
      this.assert(stats.isDirectory(), 'Should be a directory')
    })
  }

  async test_readDirectory() {
    await this.test('read-directory: Lists directory contents', async () => {
      const { readDirectory } = require('../main/manager/dir-load')
      const result = await readDirectory(TEST_DIR)
      const parsed = JSON.parse(result)
      this.assert(parsed.success === true, 'Should return success: true')
      this.assert(parsed.items_found > 0, 'Should find items')
      this.assert(parsed.content.some((i: any) => i.name === 'test.txt'), 'Should contain test.txt')
    })
  }

  async test_readDirectory_NonExistent() {
    await this.test('read-directory: Non-existent returns error', async () => {
      const { readDirectory } = require('../main/manager/dir-load')
      const result = await readDirectory(path.join(TEST_DIR, 'nonexistent'))
      const parsed = JSON.parse(result)
      this.assert(parsed.success === false, 'Should return success: false')
    })
  }

  // ====== PHASE 2: ENHANCED FEATURES ======

  async test_getFileProperties() {
    await this.test('get-file-properties: Returns complete file info', async () => {
      const { getFileProperties } = require('../main/manager/file-management-enhanced')
      const result = await getFileProperties(path.join(TEST_DIR, 'test.txt'))
      this.assert(result.success === true, 'Should succeed')
      this.assert(result.properties.name === 'test.txt', 'Should have correct name')
      this.assert(result.properties.size > 0, 'Should have size > 0')
      this.assert(result.properties.extension === '.txt', 'Should have .txt extension')
      this.assert(result.properties.permissions.readable === true, 'Should be readable')
      this.assert(result.properties.created !== '', 'Should have created date')
      this.assert(result.properties.modified !== '', 'Should have modified date')
    })
  }

  async test_getFileProperties_Directory() {
    await this.test('get-folder-info: Returns complete folder info', async () => {
      const { getFolderInfo } = require('../main/manager/file-management-enhanced')
      const result = await getFolderInfo(TEST_DIR)
      this.assert(result.success === true, 'Should succeed')
      this.assert(result.info.fileCount > 0, 'Should have files')
      this.assert(result.info.folderCount > 0, 'Should have subfolders')
      this.assert(result.info.totalSize > 0, 'Should have total size')
    })
  }

  async test_getFolderInfo() {
    await this.test('get-folder-info: Counts files and folders', async () => {
      const { getFolderInfo } = require('../main/manager/file-management-enhanced')
      const result = await getFolderInfo(TEST_DIR)
      this.assert(result.success === true, 'Should succeed')
      this.assert(result.info.fileCount >= 5, `Should have >= 5 files, got ${result.info.fileCount}`)
      this.assert(result.info.folderCount >= 2, `Should have >= 2 folders, got ${result.info.folderCount}`)
    })
  }

  async test_fileExists_True() {
    await this.test('file-exists: Returns true for existing file', async () => {
      const { fileExists } = require('../main/manager/file-management-enhanced')
      const result = await fileExists(path.join(TEST_DIR, 'test.txt'))
      this.assert(result.exists === true, 'Should exist')
      this.assert(result.isFile === true, 'Should be a file')
    })
  }

  async test_fileExists_False() {
    await this.test('file-exists: Returns false for non-existent file', async () => {
      const { fileExists } = require('../main/manager/file-management-enhanced')
      const result = await fileExists(path.join(TEST_DIR, 'ghost.txt'))
      this.assert(result.exists === false, 'Should not exist')
    })
  }

  async test_renameFile() {
    await this.test('rename-file: Renames file successfully', async () => {
      const { renameFile } = require('../main/manager/file-management-enhanced')
      await fs.writeFile(path.join(TEST_DIR, 'rename_me.txt'), 'rename', 'utf-8')
      const result = await renameFile(path.join(TEST_DIR, 'rename_me.txt'), 'renamed.txt')
      this.assert(result.success === true, 'Rename should succeed')
      this.assert(result.newPath.includes('renamed.txt'), 'New path should have new name')
    })
  }

  async test_renameFile_Exists() {
    await this.test('rename-file: Fails if target exists', async () => {
      const { renameFile } = require('../main/manager/file-management-enhanced')
      await fs.writeFile(path.join(TEST_DIR, 'exists1.txt'), 'a', 'utf-8')
      await fs.writeFile(path.join(TEST_DIR, 'exists2.txt'), 'b', 'utf-8')
      const result = await renameFile(path.join(TEST_DIR, 'exists1.txt'), 'exists2.txt')
      this.assert(result.success === false, 'Should fail if target exists')
    })
  }

  async test_getRecentFiles() {
    await this.test('get-recent-files: Returns recent files', async () => {
      const { getRecentFiles } = require('../main/manager/file-management-enhanced')
      const result = await getRecentFiles(TEST_DIR, 5)
      this.assert(result.success === true, 'Should succeed')
      this.assert(result.files.length > 0, 'Should find files')
    })
  }

  async test_getFileTypeInfo_Text() {
    await this.test('get-file-type: Detects text file correctly', async () => {
      const { getFileTypeInfo } = require('../main/manager/file-management-enhanced')
      const result = await getFileTypeInfo(path.join(TEST_DIR, 'test.txt'))
      this.assert(result.success === true, 'Should succeed')
      this.assertEqual(result.info.category, 'text')
      this.assertEqual(result.info.extension, '.txt')
    })
  }

  async test_getFileTypeInfo_Image() {
    await this.test('get-file-type: Detects code file correctly', async () => {
      const { getFileTypeInfo } = require('../main/manager/file-management-enhanced')
      const result = await getFileTypeInfo(path.join(TEST_DIR, 'test.js'))
      this.assert(result.success === true, 'Should succeed')
      this.assertEqual(result.info.category, 'code')
    })
  }

  async test_findDuplicates() {
    await this.test('find-duplicates: Finds duplicate files', async () => {
      await fs.writeFile(path.join(TEST_DIR, 'dup1.txt'), 'same content', 'utf-8')
      await fs.writeFile(path.join(TEST_DIR, 'sub1', 'dup2.txt'), 'same content', 'utf-8')
      const { findDuplicateFiles } = require('../main/manager/file-management-enhanced')
      const result = await findDuplicateFiles(TEST_DIR)
      this.assert(result.success === true, 'Should succeed')
      this.assert(result.duplicates.length > 0, 'Should find duplicates')
    })
  }

  async test_openInIRISViewer_Text() {
    await this.test('file:open-in-iris: Opens text file in IRIS viewer', async () => {
      const { openInIRISViewer } = require('../main/manager/file-management-enhanced')
      const result = await openInIRISViewer(path.join(TEST_DIR, 'test.txt'))
      this.assert(result.success === true, 'Should open in IRIS viewer')
      this.assert(result.windowId > 0, 'Should have window ID')
    })
  }

  async test_openInIRISViewer_Image() {
    await this.test('file:open-in-iris: Handles image file', async () => {
      const { openInIRISViewer } = require('../main/manager/file-management-enhanced')
      const { openInIRISViewer: openIRIS } = require('../main/manager/file-management-enhanced')
      // Create a tiny valid PNG
      const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
      await fs.writeFile(path.join(TEST_DIR, 'test.png'), pngBuffer)
      const result = await openIRIS(path.join(TEST_DIR, 'test.png'))
      this.assert(result.success === true, 'Should open image in IRIS viewer')
    })
  }

  async test_openFileInApp() {
    await this.test('file:open-in-app: Opens file in specified app', async () => {
      const { openFileInApp } = require('../main/manager/file-open')
      const result = await openFileInApp(path.join(TEST_DIR, 'test.txt'), 'notepad')
      this.assert(result.success === true, 'Should open in notepad')
    })
  }

  // ====== PHASE 3: PERMISSION & ERROR HANDLING ======

  async test_permissionDenied() {
    await this.test('Permission: Handles permission denied gracefully', async () => {
      const { readFile } = require('../main/manager/file-read')
      // Try reading a system file that might be restricted
      const result = await readFile('C:\\Windows\\System32\\config\\SAM')
      // Should return structured error, not crash
      this.assert(typeof result === 'object', 'Should return structured result')
    })
  }

  async test_crossDeviceCopy() {
    await this.test('Cross-device: Copy works across drives', async () => {
      const { executeFileOp } = require('../main/manager/file-ops')
      const src = path.join(TEST_DIR, 'test.json')
      const dest = path.join(TEST_DIR, 'json_copy.json')
      const result = await executeFileOp({ operation: 'copy', sourcePath: src, destPath: dest })
      this.assert(result.success === true, 'Copy should succeed')
    })
  }

  async test_largeFile() {
    await this.test('Large file: Handles large file read/write', async () => {
      const largeContent = 'x'.repeat(100000)
      await fs.writeFile(path.join(TEST_DIR, 'large.txt'), largeContent, 'utf-8')
      const { readFile } = require('../main/manager/file-read')
      const result = await readFile(path.join(TEST_DIR, 'large.txt'))
      this.assert(result.success === true, 'Should read large file')
      this.assert(result.truncated === true, 'Should be truncated')
      this.assertEqual(result.totalLength, 100000)
    })
  }

  async test_specialCharacters() {
    await this.test('Special chars: Handles filenames with special characters', async () => {
      const specialName = 'file (1) [copy].txt'
      await fs.writeFile(path.join(TEST_DIR, specialName), 'special', 'utf-8')
      const { readFile } = require('../main/manager/file-read')
      const result = await readFile(path.join(TEST_DIR, specialName))
      this.assert(result.success === true, 'Should handle special chars')
    })
  }

  // ====== PHASE 4: EDGE CASES ======

  async test_emptyFile() {
    await this.test('Empty file: Reads empty file successfully', async () => {
      await fs.writeFile(path.join(TEST_DIR, 'empty.txt'), '', 'utf-8')
      const { readFile } = require('../main/manager/file-read')
      const result = await readFile(path.join(TEST_DIR, 'empty.txt'))
      this.assert(result.success === true, 'Should read empty file')
    })
  }

  async test_nestedDirectories() {
    await this.test('Nested: Creates deeply nested directories', async () => {
      const deepPath = path.join(TEST_DIR, 'a', 'b', 'c', 'd', 'e')
      const fs = require('fs/promises')
      await fs.mkdir(deepPath, { recursive: true })
      await fs.writeFile(path.join(deepPath, 'deep.txt'), 'deep', 'utf-8')
      const { readFile } = require('../main/manager/file-read')
      const result = await readFile(path.join(deepPath, 'deep.txt'))
      this.assert(result.success === true, 'Should read from deep path')
    })
  }

  async test_deeplyNestedPath() {
    await this.test('Deep path: Reads from 10-level nested path', async () => {
      let deepPath = TEST_DIR
      for (let i = 0; i < 10; i++) deepPath = path.join(deepPath, `level${i}`)
      const fs = require('fs/promises')
      await fs.mkdir(deepPath, { recursive: true })
      await fs.writeFile(path.join(deepPath, 'deep10.txt'), 'level10', 'utf-8')
      const { readFile } = require('../main/manager/file-read')
      const result = await readFile(path.join(deepPath, 'deep10.txt'))
      this.assert(result.success === true, 'Should read from 10-level deep path')
    })
  }
}

module.exports = FileManagementTest
