import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Button,
  IconButton,
  Chip,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ClearAll as ClearAllIcon,
  PlayArrow as PlayArrowIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

const DAEViewerControls = ({
  availableFiles,
  loadedFiles,
  loading,
  error,
  onLoadFile,
  onRemoveFile,
  onClearAll,
  onSetTransparency,
  onLoadTestFiles
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [selectedFile, setSelectedFile] = useState('');
  const [showError, setShowError] = useState(true);

  // 处理文件选择
  const handleFileSelect = useCallback((event) => {
    const fileName = event.target.value;
    if (fileName) {
      onLoadFile(fileName);
      setSelectedFile(''); // 重置选择
    }
  }, [onLoadFile]);

  // 处理透明度变化
  const handleTransparencyChange = useCallback((fileName, value) => {
    onSetTransparency(fileName, value);
  }, [onSetTransparency]);

  // 处理错误关闭
  const handleErrorClose = useCallback(() => {
    setShowError(false);
  }, []);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: theme.spacing(2),
        left: theme.spacing(2),
        zIndex: 1000,
        maxWidth: isMobile ? 'calc(100vw - 32px)' : 400,
        width: '100%'
      }}
    >
      {/* 主控制面板 */}
      <Paper
        elevation={8}
        sx={{
          p: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
          maxHeight: '80vh',
          overflowY: 'auto'
        }}
      >
        {/* 标题 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <VisibilityIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
            DAE文件查看器
          </Typography>
        </Box>

        {/* 文件选择 */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="file-select-label">选择DAE文件</InputLabel>
          <Select
            labelId="file-select-label"
            value={selectedFile}
            label="选择DAE文件"
            onChange={handleFileSelect}
            disabled={loading}
          >
            {availableFiles.map((file) => (
              <MenuItem key={file} value={file}>
                {file}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 操作按钮组 */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrowIcon />}
            onClick={onLoadTestFiles}
            disabled={loading}
            sx={{ flex: 1, minWidth: 120 }}
          >
            测试加载
          </Button>
          
          <Button
            variant="outlined"
            color="error"
            startIcon={<ClearAllIcon />}
            onClick={onClearAll}
            disabled={loading || loadedFiles.length === 0}
            sx={{ flex: 1, minWidth: 120 }}
          >
            清空所有
          </Button>
        </Box>

        {/* 加载状态指示器 */}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              正在加载文件...
            </Typography>
          </Box>
        )}

        {/* 错误提示 */}
        {error && showError && (
          <Alert
            severity="error"
            onClose={handleErrorClose}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        {/* 已加载文件列表 */}
        {loadedFiles.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              已加载文件 ({loadedFiles.length})
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {loadedFiles.map((file) => (
                <Paper
                  key={file.fileName}
                  elevation={2}
                  sx={{
                    p: 2,
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  {/* 文件信息和控制 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Chip
                      label={file.fileName}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ flex: 1, justifyContent: 'flex-start' }}
                    />
                    
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onRemoveFile(file.fileName)}
                      disabled={loading}
                      sx={{ ml: 1 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* 透明度控制 */}
                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        透明度
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {file.opacity.toFixed(2)}
                      </Typography>
                    </Box>
                    
                    <Slider
                      value={file.opacity}
                      onChange={(_, value) => handleTransparencyChange(file.fileName, value)}
                      min={0}
                      max={1}
                      step={0.01}
                      size="small"
                      disabled={loading}
                      sx={{
                        '& .MuiSlider-thumb': {
                          height: 16,
                          width: 16,
                        },
                        '& .MuiSlider-track': {
                          height: 4,
                        },
                        '& .MuiSlider-rail': {
                          height: 4,
                        }
                      }}
                    />
                  </Box>
                </Paper>
              ))}
            </Box>
          </>
        )}

        {/* 统计信息 */}
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            可用文件: {availableFiles.length} | 已加载: {loadedFiles.length}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default DAEViewerControls; 